import "tsconfig-paths/register"
/**
 * tsconfig-paths/register allows jest globalSetup to use aliases.
 * This is required because globalSetup/Teardown live separately from
 * the rest of the jest ecosystem.
 *
 * https://stackoverflow.com/a/67729228
 */

import { Sequelize } from "sequelize"
import { Umzug, SequelizeStorage } from "umzug"

import { sequelize } from "@tests/database"

const setupDb = async () => {
  console.log("setting up database for testing")

  const migrator = new Umzug({
    migrations: {
      glob: "src/database/migrations/*.js",
      // NOTE: The below portion is taken directly from the docs
      // Read more here: https://github.com/sequelize/umzug#modifying-the-parameters-passed-to-your-migration-methods
      resolve: ({ name, path, context }) => {
        const migration = require(path!)
        return {
          // adjust the parameters Umzug will
          // pass to migration methods when called
          name,
          up: async () => migration.up(context, Sequelize),
          down: async () => migration.down(context, Sequelize),
        }
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  })

  // Run all migrations in the folder
  console.log("running existing migrations...")
  await migrator.up()

  return migrator
}

export default setupDb
