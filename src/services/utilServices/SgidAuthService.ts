import SgidClient, { generatePkcePair } from "@opengovsg/sgid-client"
import { ResultAsync, err, ok } from "neverthrow"

import {
  SgidCreateRedirectUrlError,
  SgidFetchAccessTokenError,
  SgidFetchUserInfoError,
} from "@root/errors/SgidErrors"
import logger from "@root/logger/logger"

const SGID_WORK_EMAIL_SCOPE = "ogpofficerinfo.work_email"

interface SgidAuthServiceProps {
  sgidClient: SgidClient
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

  retrieveSgidUserEmail(
    accessToken: string,
    sub: string
  ): ResultAsync<string | undefined, SgidFetchUserInfoError> {
    return ResultAsync.fromPromise(
      this.sgidClient
        .userinfo({
          accessToken,
          sub,
        })
        .then(({ data }) => data[SGID_WORK_EMAIL_SCOPE]),
      (error) => {
        logger.error(`Error while retrieving user info from sgid: ${error}`)
        return new SgidFetchUserInfoError()
      }
    )
  }
}
