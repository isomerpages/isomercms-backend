// Import logger
import _ from "lodash"
import { RequireAllOrNone, SetOptional } from "type-fest"

import { config } from "@config/config"

import logger from "@logger/logger"

// Import errors
import { AuthError } from "@errors/AuthError"

import jwtUtils from "@utils/jwt-utils"

import { SessionDataProps } from "@root/classes"
import {
  E2E_TEST_EMAIL,
  E2E_ISOMER_ID,
  CollaboratorRoles,
} from "@root/constants"
import { Site, SiteMember, User } from "@root/database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import { SessionData } from "@root/types/express/session"

export const E2E_TEST_REPO = config.get("cypress.e2eTestRepo")
export const E2E_EMAIL_TEST_SITE = {
  // NOTE: name is a human readable name
  // but repo is the underlying github reference
  name: "e2e email test site",
  repo: "e2e-email-test-repo",
}
export const E2E_NOT_GGS_TEST_REPO = "e2e-notggs-test-repo"
const E2E_TEST_SECRET = config.get("cypress.e2eTestSecret")

export const E2E_TEST_GH_TOKEN = config.get("cypress.e2eTestGithubToken")
export const E2E_TEST_GITHUB_USER = "e2e-test"
const GENERAL_ACCESS_PATHS = [
  "/v1/sites",
  "/v1/auth/whoami",
  "/v2/sites",
  "/v2/auth/whoami",
]

interface E2eCookie {
  isomercmsE2E: string
  e2eUserType: string
  site: string
  email: string
}

type UnverifiedSession =
  | Partial<SessionData>
  | { userInfo: Record<string, never> }
  | { userInfo: SetOptional<SessionData["userInfo"], "email"> }

export type VerifyAccessProps = UnverifiedSession & {
  // NOTE: Either both properties are present on the cookie
  // or none are present.
  // We disallow having 1 or the other.
  cookies?: RequireAllOrNone<
    E2eCookie,
    "e2eUserType" | "isomercmsE2E" | "site" | "email"
  >
  url: string
}

const E2E_USERS = {
  Email: {
    Admin: "Email admin",
    Collaborator: "Email collaborator",
  },
  Github: {
    User: "Github user",
  },
} as const

type TestUserTypes =
  | typeof E2E_USERS["Email"][keyof typeof E2E_USERS["Email"]]
  | typeof E2E_USERS["Github"][keyof typeof E2E_USERS["Github"]]

// NOTE: Precondition to use this function is that the user type is valid.
const getUserType = (userType: string): TestUserTypes => {
  if (userType === E2E_USERS.Email.Admin) return userType
  if (userType === E2E_USERS.Email.Collaborator) return userType
  if (userType === E2E_USERS.Github.User) return userType
  throw new Error(`Invalid user type: ${userType}`)
}

const generateE2eEmailUser = async (
  role: CollaboratorRoles,
  site?: string,
  email?: string
): Promise<SessionDataProps> => {
  const [user] = await User.findOrCreate({
    where: {
      email,
      contactNumber: "1235678",
    },
  })

  if (site) {
    const [createdSite] = await Site.findOrCreate({
      where: {
        name: site,
      },
    })
    // NOTE: We need to do this because e2e tests could try to
    // regenerate the site member with a different role.
    // Doing a `findOrCreate` with the role
    // will cause 2 entries to be created, which is not what we want.
    const siteMember = await SiteMember.findOne({
      where: {
        userId: user.id,
        siteId: createdSite.id,
      },
    })

    if (siteMember) {
      siteMember.role = role
      await siteMember.save()
    } else {
      await SiteMember.create({
        userId: user.id,
        siteId: createdSite.id,
        role,
      })
    }
  }

  return {
    isomerUserId: `${user.id}`,
    email: user.email!,
  }
}

const generateGithubUser = (): SessionDataProps => ({
  accessToken: E2E_TEST_GH_TOKEN,
  githubId: E2E_TEST_GITHUB_USER,
  isomerUserId: E2E_ISOMER_ID,
  email: E2E_TEST_EMAIL,
})

// NOTE: Exported for testing as this should be mocked to avoid hitting the db
export const extractE2eUserInfo = async (
  userType: TestUserTypes,
  site?: string,
  email?: string
): Promise<SessionDataProps> => {
  switch (userType) {
    case E2E_USERS.Email.Admin:
      return generateE2eEmailUser(CollaboratorRoles.Admin, site, email)
    case E2E_USERS.Email.Collaborator:
      return generateE2eEmailUser(CollaboratorRoles.Contributor, site, email)
    case E2E_USERS.Github.User:
      return generateGithubUser()
    default: {
      const missingUserType: never = userType
      throw new Error(`Missing user type: ${missingUserType}`)
    }
  }
}

export default class AuthenticationMiddlewareService {
  private verifyE2E({
    cookies,
    url,
  }: Omit<VerifyAccessProps, "userInfo">): TestUserTypes | false {
    if (!cookies) return false

    const { isomercmsE2E, e2eUserType } = cookies
    const urlTokens = url.split("/") // urls take the form "/v1/sites/<repo>/<path>""

    // NOTE: If the cookie is not set, this is an actual user.
    if (!isomercmsE2E || !e2eUserType) return false

    // NOTE: Cookie is set but wrong, implying someone is trying to figure out the secret
    if (isomercmsE2E !== E2E_TEST_SECRET) throw new AuthError("Bad credentials")

    if (urlTokens.length < 3) throw new BadRequestError("Invalid path")

    const userType = getUserType(e2eUserType)

    // General access paths are allowed
    if (GENERAL_ACCESS_PATHS.includes(url)) return userType

    // Throw an error if accessing a repo other than
    // the allowed repos for each respective user type
    const repo = urlTokens[3]

    const isEmailE2eAccess =
      (repo === E2E_EMAIL_TEST_SITE.repo || repo === E2E_TEST_REPO) &&
      (userType === E2E_USERS.Email.Admin ||
        userType === E2E_USERS.Email.Collaborator)
    const isGithubE2eAccess =
      (repo === E2E_TEST_REPO || repo === E2E_NOT_GGS_TEST_REPO) &&
      userType === "Github user"

    if (!isGithubE2eAccess && !isEmailE2eAccess)
      throw new AuthError(
        `E2E tests can only access either ${E2E_TEST_REPO} or ${E2E_EMAIL_TEST_SITE.name}.`
      )

    return userType
  }

  async verifyAccess({
    cookies,
    url,
    userInfo,
  }: VerifyAccessProps): Promise<SessionDataProps> {
    const e2eUserType = this.verifyE2E({ cookies, url })
    if (e2eUserType) {
      return extractE2eUserInfo(e2eUserType, cookies?.site, cookies?.email)
    }

    try {
      if (_.isEmpty(userInfo) || !userInfo.isomerUserId) {
        const notLoggedInError = new Error("User not logged in with email")
        notLoggedInError.name = "NotLoggedInError"
        throw notLoggedInError
      }
      const {
        accessToken: retrievedToken,
        githubId,
        isomerUserId,
        email,
      } = userInfo
      const accessToken = retrievedToken
        ? jwtUtils.decryptToken(retrievedToken)
        : ""
      return {
        accessToken,
        githubId,
        isomerUserId,
        // NOTE: Email can be empty as
        // Github users don't have emails on their first sign in
        // and we ask them to validate,
        // after which their email exists.
        email: email ?? "",
      }
    } catch (err) {
      if (!(err instanceof Error)) {
        // NOTE: If the error is of an unknown kind, we bubble it up the stack and block access.
        throw err
      }
      // NOTE: Cookies aren't being logged here because they get caught as "Object object", which is not useful
      // The cookies should be converted to a JSON struct before logging
      if (err.name === "NotLoggedInError") {
        logger.error(
          `Authentication error: user not logged in with email. Url: ${url}`
        )
        throw new AuthError(
          `Authentication error: user not logged in with email`
        )
      } else if (err.name === "TokenExpiredError") {
        logger.error(`Authentication error: JWT token expired. Url: ${url}`)
        throw new AuthError(`JWT token has expired`)
      } else {
        logger.error(
          `Authentication error. Message: ${err.message} Url: ${url}`
        )
      }
      throw err
    }
  }
}
