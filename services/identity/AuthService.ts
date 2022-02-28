import { AxiosClient } from "@root/types"
import axios from "axios"

interface AuthServiceProps {
  axiosClient: AxiosClient
}

class AuthService {
  // NOTE: This should never be assigned to outside of constructor, hence use readonly
  readonly axiosClient: AxiosClient

  constructor({ axiosClient }: AuthServiceProps) {
    this.axiosClient = axiosClient
  }

  async hasAccessToSite(
    siteName: string,
    userId: string,
    accessToken: string
  ): Promise<boolean> {
    const endpoint = `/${siteName}/collaborators/${userId}`

    try {
      await this.axiosClient.get(endpoint, {
        headers: {
          Authorization: `token ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      return true
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const { status } = err.response
        if (status === 404 || status === 403) {
          return false
        }
      }

      // NOTE: If the error is of an unknown kind, we bubble it up the stack and block access.
      throw err
    }
  }
}

export default AuthService
