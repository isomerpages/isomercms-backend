const { parse } = require("pg-connection-string")

// TODO: This came from a past project - I don't remember why I wrote this but let's explore later.
// We have to manually parse database URL because sequelize-typescript requires explicit
// connection parameters.

// Note: We are using process.env here instead of convict's config.get() as sequelize-cli is unable
// to support import of TS files inside JS. Note that validation of these envs will still be
// performed by convict in src/config/config.ts.
const { DB_URI } = process.env
const DB_MIN_POOL = parseInt(process.env.DB_MIN_POOL)
const DB_MAX_POOL = parseInt(process.env.DB_MAX_POOL)

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
