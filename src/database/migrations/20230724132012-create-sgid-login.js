module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sgid_login", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      state: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      nonce: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      code_verifier: {
        allowNull: false,
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
    await queryInterface.dropTable("sgid_login")
  },
}
