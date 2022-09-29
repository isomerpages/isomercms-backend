module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("launches", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        references: {
          model: "users",
          key: "id",
        },
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      site_id: {
        references: {
          model: "sites",
          key: "id",
        },
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      primary_domain_source: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      primary_domain_target: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      domain_validation_source: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      domain_validation_target: {
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
    await queryInterface.dropTable("launches")
  },
}
