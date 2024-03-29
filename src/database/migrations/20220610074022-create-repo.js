module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("repos", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      url: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      site_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "sites",
          key: "id",
        },
        onUpdate: "CASCADE",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("repos")
  },
}
