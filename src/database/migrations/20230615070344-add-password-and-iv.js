/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.addColumn(
          "deployments", // name of Source model
          "encrypted_password", // name of column we're adding
          {
            type: Sequelize.TEXT,
            allowNull: true,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "deployments", // name of Source model
          "encryption_iv", // name of column we're adding
          {
            type: Sequelize.TEXT,
            allowNull: true,
            transaction: t,
          }
        ),
        queryInterface.addColumn(
          "deployments", // name of Source model
          "password_date", // name of column we're adding
          {
            type: Sequelize.DATE,
            allowNull: true,
            transaction: t,
          }
        ),
      ])
    )
  },

  async down(queryInterface, Sequelize) {
    queryInterface.sequelize.transaction((t) =>
      Promise.all([
        queryInterface.removeColumn(
          "deployments", // name of Source Model
          "encrypted_password", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "deployments", // name of Source Model
          "encryption_iv", // name of column we want to remove
          { transaction: t }
        ),
        queryInterface.removeColumn(
          "deployments", // name of Source Model
          "password_date", // name of column we want to remove
          { transaction: t }
        ),
      ])
    )
  },
}
