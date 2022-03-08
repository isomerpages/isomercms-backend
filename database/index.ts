import { Sequelize } from "sequelize-typescript"

import sequelizeConfig from "@database/config"

import { Site, SiteMember, User } from "./models"

// Sequelize init
const sequelize = new Sequelize(sequelizeConfig)
sequelize.addModels([User, Site, SiteMember])

export default sequelize
