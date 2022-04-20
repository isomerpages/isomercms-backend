module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("whitelist", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      email: {
        allowNull: false,
        unique: true,
        type: Sequelize.TEXT,
      },
      expiry: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("NOW() + INTERVAL '6 months'"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("whitelist")
  },
}
