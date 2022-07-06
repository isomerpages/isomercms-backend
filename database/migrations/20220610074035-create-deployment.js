module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("deployments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      production_url: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      staging_url: {
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
    await queryInterface.dropTable("deployments")
  },
}
