import _ from "lodash"
import { ModelStatic, QueryTypes } from "sequelize"
import { Sequelize } from "sequelize-typescript"
import validator from "validator"

import { ForbiddenError } from "@errors/ForbiddenError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import {
  CollaboratorRoles,
  INACTIVE_USER_THRESHOLD_DAYS,
} from "@constants/constants"

import { Whitelist, User, Site, SiteMember, Repo } from "@database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import { ConflictError } from "@root/errors/ConflictError"
import logger from "@root/logger/logger"

import IsomerAdminsService from "./IsomerAdminsService"
import SitesService from "./SitesService"
import UsersService from "./UsersService"

interface CollaboratorsServiceProps {
  sequelize: Sequelize
  siteRepository: ModelStatic<Site>
  siteMemberRepository: ModelStatic<SiteMember>
  isomerAdminsService: IsomerAdminsService
  sitesService: SitesService
  usersService: UsersService
  whitelist: ModelStatic<Whitelist>
}

class CollaboratorsService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly sequelize: CollaboratorsServiceProps["sequelize"]

  private readonly siteRepository: CollaboratorsServiceProps["siteRepository"]

  private readonly siteMemberRepository: CollaboratorsServiceProps["siteMemberRepository"]

  private readonly isomerAdminsService: CollaboratorsServiceProps["isomerAdminsService"]

  private readonly sitesService: CollaboratorsServiceProps["sitesService"]

  private readonly usersService: CollaboratorsServiceProps["usersService"]

  private readonly whitelist: CollaboratorsServiceProps["whitelist"]

  constructor({
    siteRepository,
    sequelize,
    siteMemberRepository,
    isomerAdminsService,
    sitesService,
    usersService,
    whitelist,
  }: CollaboratorsServiceProps) {
    this.siteRepository = siteRepository
    this.sequelize = sequelize
    this.siteMemberRepository = siteMemberRepository
    this.isomerAdminsService = isomerAdminsService
    this.sitesService = sitesService
    this.usersService = usersService
    this.whitelist = whitelist
  }

  deriveAllowedRoleFromEmail = async (fullEmail: string) => {
    const whitelistEntries = await this.usersService.getWhitelistRecordsFromEmail(
      fullEmail
    )

    if (!whitelistEntries.length) return null

    // TODO: Modify this method because the presence of the expiry field is not
    // the best way of differentiating Admin/Contributor roles
    return whitelistEntries[0].expiry
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
      include: [
        {
          model: User,
          as: "site_members",
          attributes: {
            // Hide PII such as contactNumber
            exclude: ["contactNumber"],
          },
        },
        {
          model: Repo,
          where: {
            name: siteName,
          },
        },
      ],
    })
    const collaborators = site?.site_members ?? []

    // We perform the following sort via application code because:
    // - sorting it via the ORM code alone is quite complicated
    // - putting the sorting logic into a stored SQL function involves DB migration work
    // - we can achieve this easily with lodash, and there is unlikely to be a performance hit
    //   given the small number of collaborators in each site
    return _.orderBy(
      collaborators,
      [
        // Prioritize Admins over Contributors
        (collaborator) =>
          collaborator.SiteMember.role === CollaboratorRoles.Admin,
        // Prioritize elements where the userId matches the requesterId (i.e. "you")
        (collaborator) => collaborator.id.toString() === requesterId,
        // Prioritize the user that has not logged in for the longest time
        (collaborator) => collaborator.lastLoggedIn,
      ],
      ["desc", "desc", "asc"]
    )
  }

  create = async (
    siteName: string,
    unparsedEmail: string,
    acknowledged: boolean
  ) => {
    const email = unparsedEmail.toLowerCase()
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
    const site = await this.sitesService.getBySiteName(siteName)
    if (site.isErr()) {
      // Error - site does not exist
      logger.error(`create collaborators error: site ${siteName} is not valid`)
      return new NotFoundError(`Site does not exist`)
    }

    // 3. Retrieve or create user if user doesn't already exist
    const user = await this.usersService.findOrCreateByEmail(email)

    // 4. Check if user is already a site member
    const existingSiteMember = await this.siteMemberRepository.findOne({
      where: {
        siteId: site.value.id,
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
      siteId: site.value.id,
      userId: user.id,
      role: derivedRole,
    })
  }

  delete = async (siteName: string, userId: string) => {
    const site = await this.siteRepository.findOne({
      include: [
        {
          model: User,
          as: "site_members",
        },
        {
          model: Repo,
          where: {
            name: siteName,
          },
        },
      ],
    })

    const siteMembers = site?.site_members ?? []
    const isUserSiteMember =
      _.filter(siteMembers, (member) => member.id.toString() === userId)
        .length > 0
    if (!isUserSiteMember) {
      return new NotFoundError(`User is not a site member`)
    }

    const siteAdmins = siteMembers.filter(
      (member) => member.SiteMember.role === CollaboratorRoles.Admin
    )
    if (
      siteAdmins.length === 1 &&
      siteAdmins[0].id.toString() === userId // Required to check if the collaborator being deleted is an admin
    ) {
      return new UnprocessableError(`Cannot delete final site admin`)
    }

    return this.siteMemberRepository.destroy({
      where: { siteId: site?.id, userId },
    })
  }

  getRole = async (
    siteName: string,
    userId: string
  ): Promise<CollaboratorRoles | null> => {
    // Note: We could make the query even cheaper if we assume the site and user cannot be deleted when this verification is done
    // Basically with just:
    // SELECT sm.role
    // FROM
    //     site_members,
    //     repos,
    // WHERE
    //     repos.site_id = site_members.site_id
    //     AND repos.name = :siteName
    //     AND site_members.user_id = :userId
    //     AND repos.deleted_at IS NULL

    const records = (await this.sequelize.query(
      `
        SELECT sm.role
        FROM
            site_members,
            sites,
            repos,
            users
        WHERE
            repos.site_id = sites.id
            AND site_members.site_id = sites.id
            AND repos.name = :siteName
            AND site_members.user_id = users.id
            AND site_members.user_id = :userId
            AND repos.deleted_at IS NULL
            AND sites.deleted_at IS NULL
            AND users.deleted_at IS NULL
      `,
      {
        replacements: { siteName, userId },
        type: QueryTypes.SELECT,
      }
    )) as { role: CollaboratorRoles }[]

    if (records.length > 0) {
      return records[0].role
    }

    const isIsomerAdmin = await this.isomerAdminsService.isUserIsomerAdmin(
      userId
    )

    return isIsomerAdmin ? CollaboratorRoles.IsomerAdmin : null
  }

  getStatistics = async (siteName: string) => {
    const inactiveLimit = new Date()
    inactiveLimit.setDate(
      inactiveLimit.getDate() - INACTIVE_USER_THRESHOLD_DAYS
    )
    const site = await this.siteRepository.findOne({
      include: [
        {
          model: User,
          as: "site_members",
        },
        {
          model: Repo,
          where: {
            name: siteName,
          },
        },
      ],
    })

    const collaborators = site?.site_members ?? []
    const totalCount = collaborators.length

    if (totalCount === 0) {
      // Every site must have at least one collaborator
      return new NotFoundError(`Site does not exist`)
    }

    const inactiveCount = collaborators.filter(
      (collaborator) => collaborator.lastLoggedIn < inactiveLimit
    ).length

    return {
      total: totalCount,
      inactive: inactiveCount,
    }
  }
}

export default CollaboratorsService
