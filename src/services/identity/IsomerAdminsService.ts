import { ModelStatic } from "sequelize"

import { IsomerAdmin } from "@database/models"

interface IsomerAdminsServiceProps {
  repository: ModelStatic<IsomerAdmin>
}

class IsomerAdminsService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly repository: IsomerAdminsServiceProps["repository"]

  constructor({ repository }: IsomerAdminsServiceProps) {
    this.repository = repository
  }

  async getByUserId(userId: string): Promise<IsomerAdmin | null> {
    const site = await this.repository.findOne({
      where: { userId },
    })

    return site
  }
}

export default IsomerAdminsService
