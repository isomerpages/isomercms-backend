module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.addColumn(
          "sites", // name of Source model
          "deleted_at", // name of column we're adding
          {
            type: Sequelize.DATE,
            allowNull: true,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "users", // name of Source model
          "deleted_at", // name of column we're adding
          {
            type: Sequelize.DATE,
            allowNull: true,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "repos", // name of Source model
          "deleted_at", // name of column we're adding
          {
            type: Sequelize.DATE,
            allowNull: true,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "deployments", // name of Source model
          "deleted_at", // name of column we're adding
          {
            type: Sequelize.DATE,
            allowNull: true,
            transaction: t,
          }
        ),
      ])
    ),

  down: async (queryInterface, _) =>
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.removeColumn(
          "sites", // name of Source Model
          "deleted_at", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "users", // name of Source Model
          "deleted_at", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "repos", // name of Source Model
          "deleted_at", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "deployments", // name of Source Model
          "deleted_at", // name of column we want to remove
          { transaction: t }
        ),
      ])
    ),
}
