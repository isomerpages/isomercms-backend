module.exports = {
  async up(queryInterface, Sequelize) {
    // Change the role enum values in the site_members table
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Change column type to TEXT
      await queryInterface.changeColumn(
        "site_members", // name of Source model
        "role", // name of column we're modifying
        {
          type: Sequelize.TEXT,
        },
        { transaction }
      )
      // 2. Discard enum type
      await queryInterface.sequelize.query(
        "drop type enum_site_members_role;",
        { transaction }
      )
      // 3. Change column type to new enum type (fails if inconsistent with existing data)
      await queryInterface.changeColumn(
        "site_members", // name of Source model
        "role", // name of column we're modifying
        {
          type: Sequelize.ENUM("ADMIN", "CONTRIBUTOR"),
        },
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    // Change the role enum values in the site_members table
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Change column type to TEXT
      await queryInterface.changeColumn(
        "site_members", // name of Source model
        "role", // name of column we're modifying
        {
          type: Sequelize.TEXT,
        },
        { transaction }
      )
      // 2. Discard enum type
      await queryInterface.sequelize.query(
        "drop type enum_site_members_role;",
        { transaction }
      )
      // 3. Change column type to new enum type (fails if inconsistent with existing data)
      await queryInterface.changeColumn(
        "site_members", // name of Source model
        "role", // name of column we're modifying
        {
          type: Sequelize.ENUM("ADMIN", "USER"),
        },
        { transaction }
      )
    })
  },
}
