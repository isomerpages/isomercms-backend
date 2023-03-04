const { parse } = require("pg-connection-string")

const config = require("@config/config")

// TODO: This came from a past project - I don't remember why I wrote this but let's explore later.
// We have to manually parse database URL because sequelize-typescript requires explicit
// connection parameters.

const DB_URI = config.get("database.dbUri")
const DB_MIN_POOL = config.get("database.dbMinPool")
const DB_MAX_POOL = config.get("database.dbMaxPool")

if (!DB_URI) throw new Error("DB_URI is not defined")
const parsed = parse(DB_URI)
const port = parsed.port ? parseInt(parsed.port, 10) : 5432

module.exports = {
  // Connection settings
  database: parsed.database || "isomercms_dev",
  host: parsed.host || "localhost",
  username: parsed.user,
  password: parsed.password,
  port,

  // Database settings
  dialect: "postgres",
  dialectOptions: {
    useUTC: false,
    timezone: "+08:00",
  },
  timezone: "+08:00",
  define: {
    underscored: true,
    charset: "utf8",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  pool: {
    min: DB_MIN_POOL,
    max: DB_MAX_POOL,
  },
}
