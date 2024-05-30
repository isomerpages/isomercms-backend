import express from "express"

import {
  auditLogsService,
  collaboratorsService,
  gitFileSystemService,
  infraService,
  repoCheckerService,
  reposService,
  usersService,
} from "@common/index"

import { FormsgGGsRepairRouter } from "./formsgGGsRepair"
import { FormsgNotifySiteCollaboratorsRouter } from "./formsgNotifySiteCollaborators"
import { FormsgSiteAuditLogsRouter } from "./formsgSiteAuditLogs"
import { FormsgSiteCheckerRouter } from "./formsgSiteChecker"
import { FormsgSiteCreateRouter } from "./formsgSiteCreation"
import { FormsgSiteLaunchRouter } from "./formsgSiteLaunch"

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

const formsgNotifySiteCollaboratorsRouter = new FormsgNotifySiteCollaboratorsRouter(
  {
    collaboratorsService,
  }
)

export const formSgRouter = express.Router()

formSgRouter.use("/formsg", formsgSiteCreateRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteLaunchRouter.getRouter())
formSgRouter.use("/formsg", formsgGGsRepairRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteCheckerRouter.getRouter())
formSgRouter.use("/formsg", formsgSiteAuditLogsRouter.getRouter())
formSgRouter.use("/formsg", formsgNotifySiteCollaboratorsRouter.getRouter())
