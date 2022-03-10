import { Sequelize, SequelizeOptions } from "sequelize-typescript"

import sequelizeConfig from "@database/config.js"

/**
 * The index argument is because the Parameters<T> type returns the parameters
 * as a tuple type, so we need to index into it.
 *
 * This method is to allow for ease of testing, so that we can dynamically inject
 * fake db models into sequelize, rather than depending upon concrete instances
 * in our unit tests.
 */
export default (models: Parameters<Sequelize["addModels"]>[0]) => {
  const sequelize = new Sequelize(sequelizeConfig as SequelizeOptions)
  sequelize.addModels(models)
  return sequelize
}
