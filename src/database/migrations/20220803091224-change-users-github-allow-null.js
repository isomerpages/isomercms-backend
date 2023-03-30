module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "github_id", {
      allowNull: true,
      unique: true,
      type: Sequelize.TEXT,
      validate: {
        notEmpty: true,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "github_id", {
      allowNull: false,
      unique: true,
      type: Sequelize.TEXT,
      validate: {
        notEmpty: true,
      },
    })
  },
}
