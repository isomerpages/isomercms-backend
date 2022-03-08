import { Sequelize, SequelizeOptions } from "sequelize-typescript"

import sequelizeConfig from "@database/config.js"

import { Site, SiteMember, User } from "./models"

// Sequelize init
const sequelize = new Sequelize(sequelizeConfig as SequelizeOptions)
sequelize.addModels([User, Site, SiteMember])

export default sequelize
