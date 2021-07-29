const { DataTypes, Model } = require("sequelize")

module.exports = (sequelize) => {
  class Site extends Model {
    static associate(models) {
      const { User, SiteMember } = models
      Site.belongsToMany(User, {
        through: SiteMember,
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      })
    }
  }

  Site.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT,
      },
      name: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      apiTokenName: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      tableName: "sites",
    }
  )

  return Site
}
