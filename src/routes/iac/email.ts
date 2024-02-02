/* eslint-disable import/prefer-default-export */
import fs from "fs"
import path from "path"

import express from "express"
import { SimpleGit } from "simple-git"

import { config } from "@config/config"

import {
  EFS_VOL_PATH_STAGING,
  EFS_VOL_PATH_STAGING_LITE,
  ISOMER_ADMIN_EMAIL,
} from "@root/constants"
import { BadRequestError } from "@root/errors/BadRequestError"
import GitFileSystemService from "@root/services/db/GitFileSystemService"
import DeploymentsService from "@root/services/identity/DeploymentsService"
import ReposService from "@root/services/identity/ReposService"
import SitesService from "@root/services/identity/SitesService"
import { RequestHandler } from "@root/types"
import { Brand } from "@root/types/util"
import UsersService from "@services/identity/UsersService"

const PULUMI_HEADER_KEY = "x-pulumi-token"

export class IacEmailCreationRouter {
  private readonly simpleGit: SimpleGit

  private readonly gfsService: GitFileSystemService

  private readonly sitesService: SitesService

  private readonly usersService: UsersService

  private readonly reposService: ReposService

  private readonly deploymentsService: DeploymentsService

  constructor(
    simpleGit: SimpleGit,
    gfsService: GitFileSystemService,
    sitesService: SitesService,
    usersService: UsersService,
    reposService: ReposService,
    deploymentsService: DeploymentsService
  ) {
    this.simpleGit = simpleGit
    this.gfsService = gfsService
    this.sitesService = sitesService
    this.usersService = usersService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
  }

  create: RequestHandler<
    unknown,
    unknown,
    {
      repoName: string
      name: string
      repoUrl: string
      stagingUrl: string
      productionUrl: string
      deploymentAppId: string
      redirectAppId: string
    }
  > = async (req, res) => {
    // 1. Extract arguments
    const {
      repoName,
      name: siteName,
      repoUrl,
      stagingUrl,
      productionUrl,
      deploymentAppId,
      redirectAppId,
    } = req.body

    // 2. Check arguments
    if (
      !repoName ||
      !siteName ||
      !repoUrl ||
      !stagingUrl ||
      !productionUrl ||
      !deploymentAppId ||
      !redirectAppId
    ) {
      throw new BadRequestError(
        "Required parameters not provided: repoName, name"
      )
    }

    const stgDir = path.join(EFS_VOL_PATH_STAGING, repoName)
    const stgLiteDir = path.join(EFS_VOL_PATH_STAGING_LITE, repoName)

    // TODO: add similar update + delete ops
    // TODO: shift this out into own route
    // Make sure the local path is empty, just in case dir was used on a previous attempt.
    fs.rmSync(`${stgDir}`, { recursive: true, force: true })
    fs.rmSync(`${stgLiteDir}`, { recursive: true, force: true })

    await this.gfsService
      .cloneBranch(repoName, true)
      .andThen(() => this.gfsService.cloneBranch(repoName, false))

    const admin = await this.usersService.findByEmail(ISOMER_ADMIN_EMAIL)

    // NOTE: Create db records in respective tables.
    const site = await this.sitesService.create({
      creator: admin!,
      creatorId: admin!.id,
      name: siteName,
    })

    await this.reposService.create({
      name: repoName,
      url: repoUrl,
      site,
      siteId: site.id,
    })

    await this.deploymentsService.create({
      stagingUrl: Brand.fromString(stagingUrl),
      productionUrl: Brand.fromString(productionUrl),
      site,
      siteId: site.id,
      hostingId: deploymentAppId,
      stagingLiteHostingId: redirectAppId,
    })

    return res.sendStatus(200)
  }

  private static attachPulumiAuthHandler: RequestHandler = (req, res, next) => {
    const authToken = req.headers[PULUMI_HEADER_KEY]
    if (authToken !== config.get("pulumi.authToken")) {
      return res.status(401).send("Unauthorized")
    }
    return next()
  }

  getRouter = () => {
    const router = express.Router({ mergeParams: true })

    router.post(
      "/create",
      IacEmailCreationRouter.attachPulumiAuthHandler,
      this.create
    )

    return router
  }
}
