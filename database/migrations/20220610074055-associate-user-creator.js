module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "sites", // name of Source model
      "creator_id", // name of column we're adding
      {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
      }
    )
  },

  down: async (queryInterface, _) => {
    await queryInterface.removeColumn(
      "sites", // name of Source Model
      "creator_id" // name of column we want to remove
    )
  },
}
