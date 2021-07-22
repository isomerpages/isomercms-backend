const databaseLoader = require("./database")

module.exports = async () => {
  await databaseLoader()
}
