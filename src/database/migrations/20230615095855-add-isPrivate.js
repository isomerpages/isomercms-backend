/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "sites", // name of Source model
      "is_private", // name of column we're adding
      {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "sites", // name of Source Model
      "is_private" // name of column we want to remove
    )
  },
}
