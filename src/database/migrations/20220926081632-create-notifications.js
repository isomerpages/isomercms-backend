module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("notifications", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      site_member_id: {
        allowNull: false,
        type: Sequelize.BIGINT,
        references: {
          model: "site_members",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      site_id: {
        allowNull: false,
        type: Sequelize.BIGINT,
        references: {
          model: "sites",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        allowNull: false,
        type: Sequelize.BIGINT,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      message: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      link: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      source_username: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      type: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      first_read_time: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      priority: {
        allowNull: false,
        type: Sequelize.BIGINT,
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
    await queryInterface.dropTable("notifications")
  },
}
