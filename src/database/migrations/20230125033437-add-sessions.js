module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sessions", {
      sid: {
        primaryKey: true,
        type: Sequelize.STRING(36),
      },
      expires: {
        type: Sequelize.DATE,
      },
      data: {
        type: Sequelize.TEXT,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sessions")
  },
}
