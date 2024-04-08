const { parse } = require("pg-connection-string")

// TODO: This came from a past project - I don't remember why I wrote this but let's explore later.
// We have to manually parse database URL because sequelize-typescript requires explicit
// connection parameters.

// Note: We are using process.env here instead of convict's config.get() as sequelize-cli is unable
// to support import of TS files inside JS. Note that validation of these envs will still be
// performed by convict in src/config/config.ts.
const { DB_READ_URI, DB_WRITE_URI } = process.env
const DB_MIN_POOL = parseInt(process.env.DB_MIN_POOL, 10)
const DB_MAX_POOL = parseInt(process.env.DB_MAX_POOL, 10)
const DB_ACQUIRE = parseInt(process.env.DB_ACQUIRE, 10)
const DB_TIMEOUT = parseInt(process.env.DB_TIMEOUT, 10)

const parsedReader = parse(DB_READ_URI)
const parsedWriter = parse(DB_WRITE_URI)
const readerPort = parsedReader.port ? parseInt(parsedReader.port, 10) : 5432
const writerPort = parsedWriter.port ? parseInt(parsedWriter.port, 10) : 5432

module.exports = {
  // Connection settings
  replication: {
    read: [
      {
        database: parsedReader.database || "isomercms_dev",
        host: parsedReader.host,
        username: parsedReader.user,
        password: parsedReader.password,
        port: readerPort,
      },
    ],
    write: {
      database: parsedWriter.database || "isomercms_dev",
      host: parsedWriter.host,
      username: parsedWriter.user,
      password: parsedWriter.password,
      port: writerPort,
    },
  },

  // Database settings
  dialect: "postgres",
  dialectOptions: {
    useUTC: false,
    timezone: "+08:00",
    idle_in_transaction_session_timeout: DB_TIMEOUT,
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
    acquire: DB_ACQUIRE,
  },
  logging: false,
}
