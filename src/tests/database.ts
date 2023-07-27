import { Sequelize, SequelizeOptions } from "sequelize-typescript"

import sequelizeConfig from "@database/config"
import {
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Otp,
  Deployment,
  Launch,
  Redirection,
  IsomerAdmin,
  Notification,
  ReviewRequest,
  ReviewMeta,
  Reviewer,
  ReviewRequestView,
} from "@database/models"

const sequelize = new Sequelize({
  ...sequelizeConfig,
} as SequelizeOptions)

sequelize.addModels([
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Otp,
  Deployment,
  Launch,
  Redirection,
  IsomerAdmin,
  Notification,
  ReviewRequest,
  ReviewMeta,
  Reviewer,
  ReviewRequestView,
])

// eslint-disable-next-line import/prefer-default-export
export { sequelize }
