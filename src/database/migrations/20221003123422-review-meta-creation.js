/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("review_meta", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      review_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "review_requests",
          key: "id",
        },
      },
      // The PR number stored by GitHub
      pull_request_number: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      // The link to view this RR
      review_link: {
        unique: true,
        type: Sequelize.STRING,
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("review_meta")
  },
}
