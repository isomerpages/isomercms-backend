const autoBind = require("auto-bind")
const express = require("express")

const logger = require("@logger/logger")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

class SiteRouter {
  constructor() {
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Create new collection
  async createSite(req, res) {
    logger.info("Create Site")

    return res.status(200).send("OK")
  }

  // Delete collection
  async readSite(req, res) {
    logger.info("Read Site")

    return res.status(200).send("OK")
  }

  // Rename collection
  async updateSite(req, res) {
    logger.info("Update Site")

    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/", this.createSite)
    router.get("/:siteName", this.readSite)
    router.patch("/:siteName", this.updateSite)

    return router
  }
}

module.exports = { SiteRouter }
