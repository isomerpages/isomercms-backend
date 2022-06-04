module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.dropTable("site_members", { transaction })
      await queryInterface.dropTable("sites", { transaction })

      await queryInterface.createTable(
        "sites",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGINT,
          },
          repository_name: {
            allowNull: false,
            unique: true,
            type: Sequelize.TEXT,
          },
          created_by: Sequelize.TEXT,
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
          agency: Sequelize.TEXT,
          site_name: Sequelize.TEXT,
          contact: Sequelize.TEXT,
          repository_url: Sequelize.TEXT,
          hosting_id: Sequelize.TEXT,
          staging_url: Sequelize.TEXT,
          production_url: Sequelize.TEXT,
          live_domain: Sequelize.TEXT,
          redirect_from: Sequelize.JSONB,
          uptime_id: Sequelize.TEXT,
          uptime_url: Sequelize.TEXT,
          launched_at: Sequelize.DATE,
          launched_by: Sequelize.TEXT,
        },
        { transaction }
      )

      await queryInterface.createTable(
        "site_members",
        {
          user_id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.BIGINT,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          site_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            references: {
              model: "sites",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          role: {
            allowNull: false,
            type: Sequelize.ENUM("ADMIN", "USER"),
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
        },
        { transaction }
      )

      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
    }
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.dropTable("site_members", { transaction })
      await queryInterface.dropTable("sites", { transaction })

      await queryInterface.createTable(
        "sites",
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGINT,
          },
          name: {
            allowNull: false,
            type: Sequelize.TEXT,
          },
          api_token_name: {
            allowNull: false,
            type: Sequelize.TEXT,
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
        },
        { transaction }
      )

      await queryInterface.createTable(
        "site_members",
        {
          user_id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.BIGINT,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          site_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            primaryKey: true,
            references: {
              model: "sites",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          role: {
            allowNull: false,
            type: Sequelize.ENUM("ADMIN", "USER"),
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
        },
        { transaction }
      )
      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
    }
  },
}
