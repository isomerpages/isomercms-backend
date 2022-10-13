module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        "review_requests", // name of Source model
        "review_status", // name of column we're adding
        {
          type: Sequelize.ENUM,
          values: ["OPEN", "MERGED", "CLOSED", "APPROVED"],
          allowNull: false,
          defaultValue: "OPEN",
          transaction: t,
        }
      )
    }),

  down: async (queryInterface, _) =>
    queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        "review_requests", // name of Source Model
        "review_status", // name of column we want to remove
        { transaction: t }
      )
      // drop created enum
      await queryInterface.sequelize.query(
        "drop type enum_review_requests_review_status;",
        { transaction: t }
      )
    }),
}
