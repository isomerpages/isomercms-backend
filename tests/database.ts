import { Sequelize, SequelizeOptions } from "sequelize-typescript"

import sequelizeConfig from "../database/config"
import {
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
} from "../database/models"

/**
 * NOTE: This is required because globalSetup/Teardown live separately from
 * the rest of the jest ecosystem.
 *
 * This means that the files defined therein won't honour the aliases defined within
 * our jest config and we have to import using relative/absolute imports.
 */
const sequelize = new Sequelize({
  ...sequelizeConfig,
} as SequelizeOptions)

sequelize.addModels([Site, SiteMember, User, Whitelist, AccessToken])

// eslint-disable-next-line import/prefer-default-export
export { sequelize }
