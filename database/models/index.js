const Sequelize = require("sequelize")

const logger = require("@logger/logger")

const config = require("../config")

const defineSite = require("./Site")
const defineSiteMember = require("./SiteMember")
const defineUser = require("./User")

const db = {}

// Initialize sequelize
const sequelize = new Sequelize({
  ...config,
  logging: process.env.DB_ENABLE_LOGGING ? logger.info : false,
})

// Define models
db.User = defineUser(sequelize)
db.Site = defineSite(sequelize)
db.SiteMember = defineSiteMember(sequelize)

// Create associations between models
Object.keys(db).forEach((modelName) => {
  const model = db[modelName]
  if (model.associate) {
    model.associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
