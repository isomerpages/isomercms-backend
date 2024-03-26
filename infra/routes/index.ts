import express from "express"

import {
  usersService,
  infraService,
  gitFileSystemService,
  reposService,
  auditLogsService,
  repoCheckerService,
} from "@common/index"

import {
  FormsgGGsRepairRouter,
  FormsgSiteAuditLogsRouter,
  FormsgSiteCheckerRouter,
  FormsgSiteCreateRouter,
  FormsgSiteLaunchRouter,
} from "./formsg"

const formsgSiteCreateRouter = new FormsgSiteCreateRouter({
  usersService,
  infraService,
  gitFileSystemService,
})
const formsgSiteLaunchRouter = new FormsgSiteLaunchRouter({
  usersService,
  infraService,
})

const formsgGGsRepairRouter = new FormsgGGsRepairRouter({
  gitFileSystemService,
  reposService,
})

const formsgSiteCheckerRouter = new FormsgSiteCheckerRouter({
  repoCheckerService,
})

const formsgSiteAuditLogsRouter = new FormsgSiteAuditLogsRouter({
  auditLogsService,
})

const formSgRouter = express.Router()

formSgRouter.use("/formsg", formsgSiteCreateRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteLaunchRouter.getRouter())
formSgRouter.use("/formsg", formsgGGsRepairRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteCheckerRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteAuditLogsRouter.getRouter())
