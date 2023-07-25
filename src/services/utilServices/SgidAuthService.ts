import SgidClient, { generatePkcePair } from "@opengovsg/sgid-client"
import { ResultAsync, err, errAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import { SgidLogin } from "@root/database/models/SgidLogin"
import DatabaseError from "@root/errors/DatabaseError"
import {
  SgidCreateRedirectUrlError,
  SgidFetchAccessTokenError,
  SgidFetchUserInfoError,
} from "@root/errors/SgidErrors"
import logger from "@root/logger/logger"
import { generateUuid } from "@root/utils/crypto-utils"

const SGID_WORK_EMAIL_SCOPE = "ogpofficerinfo.work_email"

interface SgidAuthServiceProps {
  sgidClient: SgidClient
  sgidLoginRepository: ModelStatic<SgidLogin>
}

export default class SgidAuthService {
  private sgidClient: SgidAuthServiceProps["sgidClient"]

  private sgidLoginRepository: SgidAuthServiceProps["sgidLoginRepository"]

  constructor({ sgidClient, sgidLoginRepository }: SgidAuthServiceProps) {
    this.sgidClient = sgidClient
    this.sgidLoginRepository = sgidLoginRepository
  }

  createSgidRedirectUrl() {
    // Generate a unique identifier for the request
    const state = generateUuid()

    // Generate a PKCE pair
    const { codeChallenge, codeVerifier } = generatePkcePair()

    // Generate an authorization URL
    try {
      const { url, nonce } = this.sgidClient.authorizationUrl({
        state,
        codeChallenge,
        scope: ["openid", SGID_WORK_EMAIL_SCOPE],
      })

      return ResultAsync.fromPromise(
        this.sgidLoginRepository.create({
          state,
          nonce,
          codeVerifier,
        }),
        (error) => {
          logger.error(`Error while updating sgid login database: ${error}`)
          return new DatabaseError()
        }
      ).map(() => url)
    } catch (error) {
      logger.error(`Error while creating sgid redirect url: ${error}`)
      return err(new SgidCreateRedirectUrlError())
    }
  }

  retrieveSgidAccessToken(authCode: string, state: string) {
    return ResultAsync.fromPromise(
      this.sgidLoginRepository.findOne({
        where: { state },
      }),
      (error) => {
        logger.error(`Error while querying sgid login database: ${error}`)
        return new DatabaseError()
      }
    ).andThen((loginDetails) => {
      if (!loginDetails) {
        logger.error(`Unable to find sgid login details`)
        return errAsync(new DatabaseError())
      }

      return ResultAsync.fromPromise(
        this.sgidClient.callback({
          code: authCode,
          nonce: loginDetails.nonce,
          codeVerifier: loginDetails.codeVerifier,
        }),
        (error) => {
          logger.error(`Error while retrieving sgid redirect url: ${error}`)
          return new SgidFetchAccessTokenError()
        }
      )
    })
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
