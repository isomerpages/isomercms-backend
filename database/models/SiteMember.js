const { DataTypes, Model } = require("sequelize")

module.exports = (sequelize) => {
  class SiteMember extends Model {}

  SiteMember.init(
    {
      role: {
        allowNull: false,
        type: DataTypes.ENUM("owner", "user"),
      },
    },
    {
      sequelize,
      tableName: "site_members",
    }
  )

  return SiteMember
}
