import { sequelize } from "@tests/database"

const teardownDb = async () => {
  console.log("tearing down database tables")
  await sequelize.getQueryInterface().dropAllTables()

  /**
   * We currently depend on `sequelize.dropAllTables();` during our test database clean up.
   *
   * However, there appears to be a bug with Sequelize -
   * or at least Sequelize has made some assumptions
   * about the enum names for tables with multi-part column names.
   *
   * Specifically, when Sequelize attempts to drop the sites table,
   * it assumes that the enum names for the `site_status` and `job_status` columns are
   * `enum_sites_siteStatus` and `enum_sites_jobStatus` respectively.
   *
   * Unfortunately, we have named our enums `enum_sites_site_status` and
   * `enum_sites_job_status` instead.
   *
   * Hence, we need to add the following SQL statements to ensure that the abovementioned
   * enums are dropped properly.
   *
   * 'DROP TYPE IF EXISTS "public"."enum_sites_site_status" CASCADE;'
   * 'DROP TYPE IF EXISTS "public"."enum_sites_job_status" CASCADE;'
   */

  await sequelize.query(
    'DROP TYPE IF EXISTS "public"."enum_sites_site_status" CASCADE;'
  )
  await sequelize.query(
    'DROP TYPE IF EXISTS "public"."enum_sites_job_status" CASCADE;'
  )
  await sequelize.close()
  console.log("done, exiting...")
}

export default teardownDb
