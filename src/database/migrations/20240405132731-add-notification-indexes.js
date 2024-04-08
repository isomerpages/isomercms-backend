/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      "notifications", // name of Source model
      ["site_id", "user_id"]
    )
    await queryInterface.addIndex(
      "notifications", // name of Source model
      ["user_id"]
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "notifications", // name of Source model
      ["site_id", "user_id"]
    )
    await queryInterface.removeIndex(
      "notifications", // name of Source model
      ["user_id"]
    )
  },
}
