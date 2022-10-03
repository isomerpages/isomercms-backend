module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      Promise.all([
        queryInterface.changeColumn("site_members", "user_id", {
          allowNull: false,
          primaryKey: false,
          type: Sequelize.BIGINT,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          transaction,
        }),
        queryInterface.changeColumn("site_members", "site_id", {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: false,
          references: {
            model: "sites",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          transaction,
        }),
        queryInterface.addColumn(
          "site_members", // name of Source model
          "id", // name of column we're adding
          {
            unique: true,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.BIGINT,
            transaction,
          }
        ),
      ])
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      Promise.all([
        queryInterface.removeColumn(
          "site_members", // name of Source Model
          "id", // name of column we want to remove
          { transaction }
        ),
        queryInterface.changeColumn("site_members", "user_id", {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.BIGINT,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          transaction,
        }),
        queryInterface.changeColumn("site_members", "site_id", {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "sites",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          transaction,
        }),
      ])
    })
  },
}
