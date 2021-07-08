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
        allowNull: false,
        type: DataTypes.TEXT,
        validate: {
          isEmail: true,
        },
      },
      contactNumber: {
        allowNull: true,
        type: DataTypes.STRING(255),
      },
    },
    {
      sequelize,
      tableName: "users",
    }
  )

  return User
}
