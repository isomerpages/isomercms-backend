import { sequelize } from "./database"

const teardownDb = async () => {
  await sequelize.getQueryInterface().dropDatabase("isomercms_test")
  await sequelize.close()
}

export default teardownDb
