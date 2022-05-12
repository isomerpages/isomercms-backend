import { randomInt } from "crypto"

import { InferAttributes } from "sequelize"

import { AccessToken } from "@database/models"

const getAccessToken = async () => {
  const accessTokenEntries = await AccessToken.findAll({
    order: [["id", "ASC"]],
  })
  const accessTokens = accessTokenEntries.map(
    (accessTokenEntry: InferAttributes<AccessToken>) => accessTokenEntry.token
  )
  return accessTokens[randomInt(accessTokens.length)]
}

export { getAccessToken }
