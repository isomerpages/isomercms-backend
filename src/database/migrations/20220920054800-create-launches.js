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
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      primay_domain: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      site_id: {
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("launches")
  },
}
