import { sequelize } from "@tests/database"

const teardownDb = async () => {
  console.log("tearing down database tables")
  await sequelize.getQueryInterface().dropAllTables()
  await sequelize.getQueryInterface().dropAllEnums()
  await sequelize.close()
  console.log("done, exiting...")
}

export default teardownDb
