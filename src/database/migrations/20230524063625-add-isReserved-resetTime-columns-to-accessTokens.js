module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.addColumn(
          "access_tokens", // name of Source model
          "is_reserved", // name of column we're adding
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            transaction: t,
            defaultValue: false,
          }
        ),
        queryInterface.addColumn(
          "access_tokens", // name of Source model
          "reset_time", // name of column we're adding
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
          "access_tokens", // name of Source Model
          "is_reserved", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "access_tokens", // name of Source Model
          "reset_time", // name of column we want to remove
          { transaction: t }
        ),
      ])
    ),
}
