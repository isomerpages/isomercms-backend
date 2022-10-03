/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("review_requests", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      requestor_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      site_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "sites",
          key: "id",
        },
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("review_requests")
  },
}
