module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      email: {
        allowNull: true,
        unique: true,
        type: Sequelize.TEXT,
        validate: {
          isEmail: true,
        },
      },
      github_id: {
        allowNull: false,
        unique: true,
        type: Sequelize.TEXT,
        validate: {
          notEmpty: true,
        },
      },
      contact_number: {
        allowNull: true,
        type: Sequelize.STRING(255),
      },
      last_logged_in: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
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
    await queryInterface.dropTable("users")
  },
}
