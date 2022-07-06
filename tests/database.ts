import { Sequelize, SequelizeOptions } from "sequelize-typescript"

import sequelizeConfig from "@database/config"
import {
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Deployment,
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
  Deployment,
])

// eslint-disable-next-line import/prefer-default-export
export { sequelize }
