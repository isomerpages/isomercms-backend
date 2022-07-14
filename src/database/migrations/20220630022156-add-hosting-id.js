module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "deployments", // name of Source model
      "hosting_id", // name of column we're adding
      {
        type: Sequelize.STRING,
        allowNull: false,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "deployments", // name of Source Model
      "hosting_id" // name of column we want to remove
    )
  },
}
