module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("redirections", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      launch_id: {
        references: {
          model: "launches",
          key: "id",
        },
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      type: {
        allowNull: false,
        type: Sequelize.ENUM,
        values: ["CNAME", "A"],
      },
      source: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      target: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("redirections")
    await queryInterface.sequelize.query('DROP TYPE "enum_redirections_type";')
  },
}
