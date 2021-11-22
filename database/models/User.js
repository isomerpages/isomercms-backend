const { DataTypes, Model } = require("sequelize")

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      const { Site, SiteMember } = models
      User.belongsToMany(Site, {
        through: SiteMember,
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      })
    }
  }

  User.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT,
      },
      email: {
        allowNull: true,
        unique: true,
        type: DataTypes.TEXT,
        validate: {
          isEmail: true,
        },
      },
      githubId: {
        allowNull: false,
        unique: true,
        type: DataTypes.TEXT,
        validate: {
          notEmpty: true,
        },
      },
      contactNumber: {
        allowNull: true,
        type: DataTypes.STRING(255),
      },
      lastLoggedIn: {
        type: DataTypes.DATE,
        default: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "users",
    }
  )

  return User
}
