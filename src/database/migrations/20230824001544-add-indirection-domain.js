/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "launches", // name of Source model
      "indirectionDomain", // name of column we're adding
      {
        allowNull: true,
        type: Sequelize.TEXT,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "launches", // name of Source Model
      "indirectionDomain" // name of column we want to remove
    )
  },
}
