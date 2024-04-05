/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.addIndex(
          "notifications", // name of Source model
          ["site_id", "user_id"],
          {
            transaction: t,
          }
        ),
        queryInterface.addIndex(
          "notifications", // name of Source model
          ["user_id"],
          {
            transaction: t,
          }
        ),
      ])
    )
  },

  async down(queryInterface, Sequelize) {
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.removeIndex(
          "notifications", // name of Source model
          ["site_id", "user_id"],
          {
            transaction: t,
          }
        ),
        queryInterface.removeIndex(
          "notifications", // name of Source model
          ["user_id"],
          {
            transaction: t,
          }
        ),
      ])
    )
  },
}
