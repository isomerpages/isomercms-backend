import { ModelStatic } from "sequelize"

import { Whitelist } from "@database/models"

interface WhitelistServiceProps {
  repository: ModelStatic<Whitelist>
}

type WhitelistEntry = {
  email: string
  exp: Date
}

class WhitelistService {
  private readonly repository: WhitelistServiceProps["repository"]

  constructor({ repository }: WhitelistServiceProps) {
    this.repository = repository
  }

  addWhitelist = async (emails: WhitelistEntry[]) => {
    const entries = emails.map((email) => ({
      email: email.email,
      expiry: email.exp,
    }))
    await this.repository.bulkCreate(entries)
  }
}

export default WhitelistService
