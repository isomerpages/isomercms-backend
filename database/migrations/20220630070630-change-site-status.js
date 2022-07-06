module.exports = {
  async up(queryInterface, Sequelize) {
    // Change the site_status enum values
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Change column type to TEXT
      await queryInterface.changeColumn(
        "sites", // name of Source model
        "site_status", // name of column we're modifying
        {
          type: Sequelize.TEXT,
        },
        { transaction }
      )
      // 2. Discard enum type
      await queryInterface.sequelize.query(
        "drop type enum_sites_site_status;",
        { transaction }
      )
      // 3. Change column type to new enum type (fails if inconsistent with existing data)
      await queryInterface.changeColumn(
        "sites", // name of Source model
        "site_status", // name of column we're modifying
        {
          type: Sequelize.ENUM("EMPTY", "INITIALIZED", "LAUNCHED"),
        },
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    // Change the site_status enum values
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Change column type to TEXT
      await queryInterface.changeColumn(
        "sites", // name of Source model
        "site_status", // name of column we're modifying
        {
          type: Sequelize.TEXT,
        },
        { transaction }
      )
      // 2. Discard enum type
      await queryInterface.sequelize.query(
        "drop type enum_sites_site_status;",
        { transaction }
      )
      // 3. Change column type to new enum type (fails if inconsistent with existing data)
      await queryInterface.changeColumn(
        "sites", // name of Source model
        "site_status", // name of column we're modifying
        {
          type: Sequelize.ENUM("INIT", "LAUNCH", "LIVE"),
        },
        { transaction }
      )
    })
  },
}
