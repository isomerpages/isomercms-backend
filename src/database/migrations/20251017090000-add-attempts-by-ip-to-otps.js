/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("otps", "attempts_by_ip", {
      allowNull: false,
      type: Sequelize.JSONB,
      defaultValue: {},
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("otps", "attempts_by_ip")
  },
}
