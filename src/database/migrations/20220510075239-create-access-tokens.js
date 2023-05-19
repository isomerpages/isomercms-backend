module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("access_tokens", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      token: {
        allowNull: false,
        unique: true,
        type: Sequelize.TEXT,
      },
      is_reserved: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
      },
      reset_time: {
        allowNull: true,
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("access_tokens")
  },
}
