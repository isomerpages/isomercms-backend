import SgidClient, { generatePkcePair } from "@opengovsg/sgid-client"
import { ResultAsync, err, ok } from "neverthrow"

import {
  SgidCreateRedirectUrlError,
  SgidFetchAccessTokenError,
  SgidFetchUserInfoError,
} from "@root/errors/SgidError"
import logger from "@root/logger/logger"
import { PublicOfficerData } from "@root/types/sgid"

const SGID_WORK_EMAIL_SCOPE = "pocdex.public_officer_details"

interface SgidAuthServiceProps {
  sgidClient: SgidClient
}

// Retrieved data format
interface SgidPublicOfficerDetails {
  // eslint-disable-next-line camelcase
  work_email: string
  // eslint-disable-next-line camelcase
  agency_name: string
  // eslint-disable-next-line camelcase
  department_name: string
  // eslint-disable-next-line camelcase
  employment_type: string
  // eslint-disable-next-line camelcase
  employment_title: string
}

export default class SgidAuthService {
  private sgidClient: SgidAuthServiceProps["sgidClient"]

  constructor({ sgidClient }: SgidAuthServiceProps) {
    this.sgidClient = sgidClient
  }

  createSgidRedirectUrl() {
    // Generate a PKCE pair
    const { codeChallenge, codeVerifier } = generatePkcePair()

    // Generate an authorization URL
    try {
      const { url, nonce } = this.sgidClient.authorizationUrl({
        codeChallenge,
        scope: ["openid", SGID_WORK_EMAIL_SCOPE],
      })
      return ok({
        url,
        cookieData: {
          nonce,
          codeVerifier,
        },
      })
    } catch (error) {
      logger.error(`Error while creating sgid redirect url: ${error}`)
      return err(new SgidCreateRedirectUrlError())
    }
  }

  retrieveSgidAccessToken({
    authCode,
    nonce,
    codeVerifier,
  }: {
    authCode: string
    nonce: string
    codeVerifier: string
  }) {
    return ResultAsync.fromPromise(
      this.sgidClient.callback({
        code: authCode,
        nonce,
        codeVerifier,
      }),
      (error) => {
        logger.error(`Error while retrieving sgid redirect url: ${error}`)
        return new SgidFetchAccessTokenError()
      }
    )
  }

  retrieveSgidUserData(
    accessToken: string,
    sub: string
  ): ResultAsync<PublicOfficerData[] | undefined, SgidFetchUserInfoError> {
    return ResultAsync.fromPromise(
      this.sgidClient
        .userinfo({
          accessToken,
          sub,
        })
        .then(({ data }) => {
          const employmentDetails: SgidPublicOfficerDetails[] = JSON.parse(
            data[SGID_WORK_EMAIL_SCOPE]
          )
          const employmentResp = employmentDetails.map((detail) => ({
            email: detail.work_email,
            agencyName: detail.agency_name,
            departmentName: detail.department_name,
            employmentTitle: detail.employment_title,
          }))
          return employmentResp
        }),
      (error) => {
        logger.error(`Error while retrieving user info from sgid: ${error}`)
        return new SgidFetchUserInfoError()
      }
    )
  }
}
