/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "sites", // name of Source Model
      "api_token_name" // name of column we want to remove
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "sites", // name of Source model
      "api_token_name", // name of column we're adding
      {
        allowNull: true,
        defaultValue: "",
        type: Sequelize.TEXT,
      }
    )
  },
}
