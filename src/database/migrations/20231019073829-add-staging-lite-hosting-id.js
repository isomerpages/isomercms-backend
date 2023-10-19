/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "deployments", // name of Source model
      "staging_lite_hosting_id", // name of column we're adding
      {
        allowNull: true,
        type: Sequelize.TEXT,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "deployments", // name of Source Model
      "staging_lite_hosting_id" // name of column we want to remove
    )
  },
}
