/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("otps", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      email: {
        allowNull: true,
        unique: true,
        type: Sequelize.STRING,
      },
      mobile_number: {
        allowNull: true,
        unique: true,
        type: Sequelize.STRING,
      },
      hashed_otp: {
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        type: Sequelize.STRING,
      },
      attempts: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      expires_at: {
        allowNull: false,
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("otps")
  },
}
