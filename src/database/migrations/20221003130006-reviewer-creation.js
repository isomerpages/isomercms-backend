/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("reviewers", {
      request_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT,
        references: {
          model: "review_requests",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reviewer_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    await queryInterface.dropTable("reviewers")
  },
}
