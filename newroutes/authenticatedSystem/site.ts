import autoBind from "auto-bind"
import express from "express"
import { ModelStatic } from "sequelize/types"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import {
  SysCreateSiteSchema,
  SysUpdateSiteSchema,
} from "@validators/RequestSchema"

import { Site } from "@database/models"
import { RequestHandler } from "@root/types"
import SiteService, {
  CreateSiteProps,
  UpdateSiteProps,
} from "@services/identity/SitesService"

export interface SitesRouterProps {
  sitesService: SiteService
}

export class SiteRouter {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly sitesService: SitesRouterProps["sitesService"]

  constructor({ sitesService }: SitesRouterProps) {
    this.sitesService = sitesService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // POST /
  createSite: RequestHandler<never, Site, CreateSiteProps> = async (
    req,
    res
  ) => {
    const { error } = SysCreateSiteSchema.validate(req.body)
    if (error) {
      logger.error(
        `Bad System Create Site request: ${JSON.stringify(error, null, 2)}`
      )
      throw new BadRequestError(error.message)
    }
    logger.info(`System Create Site '${req.body.repositoryName}'`)
    const site = await this.sitesService.createSite(req.body)
    return res.status(200).send(site)
  }

  // GET /:siteName
  readSite: RequestHandler<{ siteName: string }, Site, void> = async (
    req,
    res
  ) => {
    const { siteName } = req.params
    logger.info(`System Read Site '${siteName}'`)
    const site = await this.sitesService.getByRepositoryName(siteName)
    if (site == null) {
      // null response means that the record was not found.
      return res.sendStatus(404)
    }
    return res.status(200).send(site)
  }

  // PATCH /:siteName
  updateSite: RequestHandler<
    { siteName: string },
    Site,
    UpdateSiteProps
  > = async (req, res) => {
    const { siteName } = req.params

    logger.info(`System Update Site '${siteName}'`)

    const { error } = SysUpdateSiteSchema.validate(req.body)
    if (error) {
      throw new BadRequestError(error.message)
    }

    const site = await this.sitesService.updateSite(siteName, req.body)
    // if (site == null) {
    //   // null response means that the record was not found.
    //   return res.status(404).send()
    // }
    return res.status(200).send(site)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/", attachReadRouteHandlerWrapper(this.createSite))
    router.get("/:siteName", attachReadRouteHandlerWrapper(this.readSite))
    router.patch("/:siteName", attachReadRouteHandlerWrapper(this.updateSite))

    return router
  }
}
