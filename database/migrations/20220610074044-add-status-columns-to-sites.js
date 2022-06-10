import { SiteStatus, JobStatus } from "../../constants"

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.addColumn(
          "sites", // name of Source model
          "site_status", // name of column we're adding
          {
            type: Sequelize.ENUM,
            values: Object.values(SiteStatus),
            allowNull: false,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "sites", // name of Source model
          "job_status", // name of column we're adding
          {
            type: Sequelize.ENUM,
            values: Object.values(JobStatus),
            allowNull: false,
            transaction: t,
          }
        ),
      ])
    ),

  down: async (queryInterface, _) =>
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.removeColumn(
          "sites", // name of Source Model
          "site_status", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "sites", // name of Source Model
          "job_status", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.dropEnum(
          "enum_sites_site_status", // name of enum type to drop
          { transaction: t }
        ),
        queryInterface.dropEnum(
          "enum_sites_job_status", // name of enum type to drop
          { transaction: t }
        ),
      ])
    ),
}
