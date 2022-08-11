import _ from "lodash"
import { ModelStatic, Op } from "sequelize"
import validator from "validator"

import { ForbiddenError } from "@errors/ForbiddenError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import { CollaboratorRoles } from "@constants/constants"

import { Whitelist, User, Site, SiteMember } from "@database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import { ConflictError } from "@root/errors/ConflictError"
import logger from "@root/logger/logger"

import SitesService from "./SitesService"
import UsersService from "./UsersService"

interface CollaboratorsServiceProps {
  siteRepository: ModelStatic<Site>
  siteMemberRepository: ModelStatic<SiteMember>
  sitesService: SitesService
  usersService: UsersService
  whitelist: ModelStatic<Whitelist>
}

class CollaboratorsService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly siteRepository: CollaboratorsServiceProps["siteRepository"]

  private readonly siteMemberRepository: CollaboratorsServiceProps["siteMemberRepository"]

  private readonly sitesService: CollaboratorsServiceProps["sitesService"]

  private readonly usersService: CollaboratorsServiceProps["usersService"]

  private readonly whitelist: CollaboratorsServiceProps["whitelist"]

  constructor({
    siteRepository,
    siteMemberRepository,
    sitesService,
    usersService,
    whitelist,
  }: CollaboratorsServiceProps) {
    this.siteRepository = siteRepository
    this.siteMemberRepository = siteMemberRepository
    this.sitesService = sitesService
    this.usersService = usersService
    this.whitelist = whitelist
  }

  deriveAllowedRoleFromEmail = async (fullEmail: string) => {
    const whitelistEntries = await this.whitelist.findAll({
      where: {
        expiry: {
          [Op.or]: [{ [Op.is]: null }, { [Op.gt]: new Date() }],
        },
      },
    })

    const matchedDomains = whitelistEntries.filter((entry) =>
      fullEmail.endsWith(entry.email)
    )

    if (!matchedDomains.length) return null

    // TODO: Modify this method because the presence of the expiry field is not
    // the best way of differentiating Admin/Contributor roles
    return matchedDomains[0].expiry
      ? CollaboratorRoles.Contributor
      : CollaboratorRoles.Admin
  }

  list = async (siteName: string, requesterId?: string) => {
    // Note:
    // ===============================================
    // We need to query from the Sites table instead of the SiteMembers table
    // because Sequelize only recognizes that there is a relationship between Sites <-> Users.
    // This means that we cannot retrieve joins if we start the query in the SiteMembers table.
    //
    // However, the converse is possible, i.e. we can query the Sites table and retrieve joined
    // records from the Users table, along with the SiteMember records.
    const site = await this.siteRepository.findOne({
      where: { name: siteName },
      include: [
        {
          model: User,
          as: "site_members",
        },
      ],
    })
    const collaborators = site?.users ?? []

    // We perform the following sort via application code because:
    // - sorting it via the ORM code alone is quite complicated
    // - putting the sorting logic into a stored SQL function involves DB migration work
    // - we can achieve this easily with lodash, and there is unlikely to be a performance hit
    //   given the small number of collaborators in each site
    return _.orderBy(
      collaborators,
      [
        // Prioritize Admins over Contributors
        (
          collaborator: User & {
            SiteMember: SiteMember
          }
        ) => collaborator.SiteMember.role === CollaboratorRoles.Admin,
        // Prioritize elements where the userId matches the requesterId (i.e. "you")
        (
          collaborator: User & {
            SiteMember: SiteMember
          }
        ) => collaborator.id.toString() === requesterId,
        // Prioritize the last logged in user
        (
          collaborator: User & {
            SiteMember: SiteMember
          }
        ) => collaborator.lastLoggedIn,
      ],
      ["desc", "desc", "asc"]
    )
  }

  create = async (siteName: string, email: string, acknowledged: boolean) => {
    let site
    let user

    if (!email || !validator.isEmail(email)) {
      return new BadRequestError(
        "That doesn't look like a valid email. Try a gov.sg or other whitelisted email."
      )
    }

    // 1. Check if email address is whitelisted, and derive the collaborator role
    const derivedRole = await this.deriveAllowedRoleFromEmail(email)
    if (!derivedRole) {
      // Error - the user email is not whitelisted
      logger.error(
        `create collaborators error: user email ${email} is not whitelisted`
      )
      return new ForbiddenError(
        `This collaborator couldn't be added. Visit our guide for more assistance.`
      )
    }

    // 2. Check if site exists
    site = await this.sitesService.getBySiteName(siteName)
    if (!site) {
      // Error - site does not exist
      logger.error(`create collaborators error: site ${siteName} is not valid`)
      return new NotFoundError(`Site does not exist`)
    }

    // 3. Check if valid user exists
    user = await this.usersService.findByEmail(email)
    if (!user) {
      // Error - user with a valid gov email does not exist
      logger.error(`create collaborators error: user ${email} is not valid`)
      return new NotFoundError(
        `This user does not have an Isomer account. Ask them to log in to Isomer and try adding them again.`
      )
    }

    // 4. Check if user is already a site member
    const existingSiteMember = await this.siteMemberRepository.findOne({
      where: {
        siteId: site.id,
        userId: user.id,
      },
    })
    if (existingSiteMember) {
      return new ConflictError(`User is already a member of the site`)
    }

    // 5. Ensure that acknowledgement is true if the email role is contributor
    if (derivedRole === CollaboratorRoles.Contributor && !acknowledged) {
      return new UnprocessableError("Acknowledgement required")
    }

    // 6. Create the SiteMembers record
    return this.siteMemberRepository.create({
      siteId: site.id,
      userId: user.id,
      role: derivedRole,
    })
  }

  delete = async (siteName: string, userId: string) => {
    const site = await this.siteRepository.findOne({
      where: { name: siteName },
      include: [
        {
          model: User,
          as: "site_members",
        },
      ],
    })

    const siteMembers = site?.users ?? []
    if (
      !siteMembers.filter((member) => member.id.toString() === userId).length
    ) {
      return new NotFoundError(`User is not a site member`)
    }

    const siteAdmins = siteMembers.filter(
      (member) => member.SiteMember.role === CollaboratorRoles.Admin
    )
    if (siteAdmins.length === 1 && siteAdmins[0].id.toString() === userId) {
      return new UnprocessableError(`Cannot delete final site admin`)
    }

    return this.siteMemberRepository.destroy({
      where: { siteId: site?.id, userId },
    })
  }

  getRole = async (siteName: string, userId: string) => {
    const site = await this.siteRepository.findOne({
      where: { name: siteName },
      include: [
        {
          model: User,
          as: "site_members",
          where: {
            id: userId,
          },
        },
      ],
    })

    return (site?.users?.[0]?.SiteMember?.role as string | null) ?? null
  }
}

export default CollaboratorsService
