import fs from "fs"
import path from "path"

import { Octokit } from "@octokit/rest"
import moment from "moment-timezone"
import { ResultAsync, errAsync, okAsync } from "neverthrow"
import Papa from "papaparse"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { CollaboratorRoles, EFS_VOL_PATH_AUDIT_LOGS } from "@root/constants"
import { User } from "@root/database/models/User"
import AuditLogsError from "@root/errors/AuditLogsError"
import DatabaseError from "@root/errors/DatabaseError"
import { ForbiddenError } from "@root/errors/ForbiddenError"
import logger from "@root/logger/logger"
import { AuditLog, AuditableActivityNames } from "@root/types/auditLog"
import { IsomerCommitMessage } from "@root/types/github"
import { tokenServiceInstance } from "@services/db/TokenService"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import NotificationsService from "@services/identity/NotificationsService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { mailer } from "@services/utilServices/MailClient"

interface AuditLogsServiceProps {
  collaboratorsService: CollaboratorsService
  isomerAdminsService: IsomerAdminsService
  notificationsService: NotificationsService
  reviewRequestService: ReviewRequestService
  sitesService: SitesService
  usersService: UsersService
}

class AuditLogsService {
  private readonly collaboratorsService: AuditLogsServiceProps["collaboratorsService"]

  private readonly isomerAdminsService: AuditLogsServiceProps["isomerAdminsService"]

  private readonly notificationsService: AuditLogsServiceProps["notificationsService"]

  private readonly reviewRequestService: AuditLogsServiceProps["reviewRequestService"]

  private readonly sitesService: AuditLogsServiceProps["sitesService"]

  private readonly usersService: AuditLogsServiceProps["usersService"]

  constructor({
    collaboratorsService,
    isomerAdminsService,
    notificationsService,
    reviewRequestService,
    sitesService,
    usersService,
  }: AuditLogsServiceProps) {
    this.collaboratorsService = collaboratorsService
    this.isomerAdminsService = isomerAdminsService
    this.notificationsService = notificationsService
    this.reviewRequestService = reviewRequestService
    this.sitesService = sitesService
    this.usersService = usersService
  }

  getAuditLogActorNameFromId(userId: string) {
    return ResultAsync.fromPromise(
      this.isomerAdminsService.isUserIsomerAdmin(userId),
      (error) => {
        logger.error(
          `Site audit log error: Unable to get user's Isomer admin status from the database: ${JSON.stringify(
            error
          )}`
        )

        return new DatabaseError(
          "Error getting user's permissions from the database"
        )
      }
    )
      .andThen((isIsomerAdmin) => {
        if (isIsomerAdmin) {
          return okAsync("Isomer Admin")
        }

        return errAsync(false)
      })
      .orElse(() =>
        ResultAsync.fromPromise(this.usersService.findById(userId), (error) => {
          logger.error(
            `Site audit log error: Unable to get user data from the database using the user ID (${userId}): ${JSON.stringify(
              error
            )}`
          )

          return new DatabaseError(
            "Error getting user data from the database using the user ID"
          )
        }).andThen((user) => {
          if (user && user.email) {
            return okAsync(user.email)
          }

          return errAsync(false)
        })
      )
  }

  getAuditLogActorNameFromGitHubId(gitHubId: string) {
    return ResultAsync.fromPromise(
      this.usersService.findByGitHubId(gitHubId),
      (error) => {
        logger.error(
          `Site audit log error: Unable to get user data from the database using the GitHub ID (${gitHubId}): ${JSON.stringify(
            error
          )}`
        )

        return new DatabaseError(
          "Error getting user data from the database using the GitHub ID"
        )
      }
    )
      .andThen((user) => {
        if (!user) {
          return errAsync(false)
        }

        return ResultAsync.combine([
          okAsync(user),
          ResultAsync.fromPromise(
            this.isomerAdminsService.isUserIsomerAdmin(user.id.toString()),
            (error) => {
              logger.error(
                `Site audit log error: Unable to get user's Isomer admin status from the database: ${JSON.stringify(
                  error
                )}`
              )

              return new DatabaseError(
                "Error getting user's permissions from the database"
              )
            }
          ),
        ])
      })
      .andThen(([user, isIsomerAdmin]) => {
        if (isIsomerAdmin) {
          return okAsync("Isomer Admin")
        }

        if (user.email) {
          return okAsync(user.email)
        }

        return errAsync(false)
      })
  }

  getAuditLogs(
    sessionData: UserWithSiteSessionData,
    sinceDate: string = new Date("1970-01-01").toISOString(),
    untilDate: string = new Date().toISOString()
  ): ResultAsync<AuditLog[], AuditLogsError> {
    const octokit = new Octokit({
      auth: sessionData.accessToken,
    })

    logger.info(
      `Getting site audit logs for site ${sessionData.siteName}, from ${sinceDate} to ${untilDate}`
    )

    return ResultAsync.fromPromise(
      octokit.paginate(octokit.repos.listCommits, {
        owner: "isomerpages",
        repo: sessionData.siteName,
        since: moment(sinceDate).startOf("day").toISOString(),
        until: moment(untilDate).endOf("day").toISOString(),
        per_page: 100,
      }),
      (error) => {
        logger.error(
          `Site audit log error: Unable to get the list of commits for the site ${
            sessionData.siteName
          } from GitHub: ${JSON.stringify(error)}`
        )

        return new AuditLogsError(
          `Error occurred when getting the list of commits for the site ${sessionData.siteName}`
        )
      }
    )
      .andThen((commits) =>
        ResultAsync.combine(
          commits
            .filter(
              (commit) =>
                // Note: We can ignore merge commits since we are on the staging branch
                !commit.commit.message.startsWith("Merge ")
            )
            .map((commit) => {
              const { message } = commit.commit

              if (message.startsWith("{")) {
                try {
                  const parsedMessage: IsomerCommitMessage = JSON.parse(message)

                  return this.getAuditLogActorNameFromId(parsedMessage.userId)
                    .orElse((error) => {
                      if (typeof error === "boolean") {
                        return okAsync(
                          commit.commit.author?.name || "Unknown author"
                        )
                      }

                      return errAsync(error)
                    })
                    .andThen((actorEmail) =>
                      okAsync<AuditLog, never>({
                        timestamp: new Date(commit.commit.author?.date || ""),
                        activity: AuditableActivityNames.SavedChanges,
                        actor: actorEmail,
                        page: parsedMessage.fileName || "",
                        remarks: parsedMessage.message,
                        link: commit.html_url,
                      })
                    )
                } catch (error) {
                  logger.error(
                    `Site audit log error: Unable to parse JSON in commit ${
                      commit.sha
                    } from ${sessionData.siteName}: ${JSON.stringify(error)}\n`
                  )
                  return errAsync(
                    new AuditLogsError("Error parsing JSON in commit")
                  )
                }
              }

              return this.getAuditLogActorNameFromGitHubId(
                commit.commit.author?.name ?? ""
              )
                .orElse((error) => {
                  if (typeof error === "boolean") {
                    return okAsync(
                      commit.commit.author?.name || "Unknown author"
                    )
                  }

                  return errAsync(error)
                })
                .andThen((actorEmail) =>
                  okAsync<AuditLog, never>({
                    timestamp: new Date(commit.commit.author?.date || ""),
                    activity: AuditableActivityNames.SavedChanges,
                    actor: actorEmail,
                    page: "",
                    remarks: message,
                    link: commit.html_url,
                  })
                )
            })
        )
      )
      .andThen((auditLogs) =>
        ResultAsync.fromPromise(
          octokit.paginate(octokit.pulls.list, {
            owner: "isomerpages",
            repo: sessionData.siteName,
            per_page: 100,
            state: "closed",
            base: "master",
            head: "staging",
          }),
          (error) => {
            logger.error(
              `Site audit log error: Unable to get the list of pull requests for the site ${
                sessionData.siteName
              } from GitHub: ${JSON.stringify(error)}`
            )

            return new AuditLogsError(
              `Error occurred when getting the list of pull requests for the site ${sessionData.siteName}`
            )
          }
        )
          .andThen((pulls) =>
            okAsync(
              pulls.filter(
                (pull) =>
                  pull.merged_at &&
                  moment(sinceDate).startOf("day").isBefore(pull.merged_at) &&
                  moment(untilDate).endOf("day").isAfter(pull.merged_at)
              )
            )
          )
          .andThen((pulls) =>
            this.sitesService
              .getBySiteName(sessionData.siteName)
              .andThen((site) =>
                ResultAsync.combine(
                  pulls.flatMap((pull) =>
                    ResultAsync.combine([
                      ResultAsync.fromPromise(
                        this.reviewRequestService.getReviewRequest(
                          site,
                          pull.number
                        ),
                        (error) => {
                          logger.error(
                            `Site audit log error: Unable to retrieve review request data from the database for pull request ${pull.number} of site ${sessionData.siteName}: ${error}`
                          )
                          return new DatabaseError(
                            "Error occurred while retrieving review request data from the database"
                          )
                        }
                      ),
                      this.notificationsService.findAllForSite({
                        siteName: sessionData.siteName,
                      }),
                    ]).map<AuditLog[]>(([reviewRequest, notifications]) => [
                      // When pull/review request is published/merged
                      {
                        timestamp: new Date(pull.merged_at || ""),
                        activity: AuditableActivityNames.PublishedChanges,
                        actor:
                          "requestor" in reviewRequest &&
                          reviewRequest.requestor.email
                            ? reviewRequest.requestor.email
                            : pull.user?.login || "Unknown user",
                        page: "",
                        remarks: `GitHub Pull Request ID #${pull.number}`,
                        link: pull.html_url,
                      },

                      // When review request is created
                      ...notifications
                        .filter(
                          (notification) =>
                            notification.link.endsWith(`/${pull.number}`) &&
                            notification.type === "request_created"
                        )
                        .map((notification) => ({
                          timestamp: notification.createdAt,
                          activity: AuditableActivityNames.RequestedReview,
                          actor: notification.sourceUsername,
                          page: "",
                          remarks: `GitHub Pull Request ID #${pull.number}`,
                          link: pull.html_url,
                        }))
                        .slice(0, 1),

                      // When review request is approved
                      ...notifications
                        .filter(
                          (notification) =>
                            notification.link.endsWith(`/${pull.number}`) &&
                            notification.type === "request_approved"
                        )
                        .map((notification) => ({
                          timestamp: notification.createdAt,
                          activity: AuditableActivityNames.ApprovedReview,
                          actor: notification.sourceUsername,
                          page: "",
                          remarks: `GitHub Pull Request ID #${pull.number}`,
                          link: pull.html_url,
                        }))
                        .slice(0, 1),
                    ])
                  )
                ).map((pullsAuditLogs) => pullsAuditLogs.flat())
              )
          )
          .andThen((publishedChanges) =>
            okAsync(
              publishedChanges
                .concat(auditLogs)
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
            )
          )
      )
  }

  getAuditLogsViaFormsg(
    email: string,
    repoNames: string[],
    sinceDate: string,
    untilDate: string,
    formSubmissionId: string
  ): ResultAsync<void, AuditLogsError | ForbiddenError> {
    const emailSubject = `[Isomer] Site Audit Logs (submission ID: ${formSubmissionId})`
    logger.info(
      `Received request to get audit logs, submission ID: ${formSubmissionId}`
    )

    // Step 1: Check if the user exists
    return ResultAsync.fromPromise(
      this.usersService.findByEmail(email),
      (error) => {
        logger.error(
          `Site audit log error: Unable to retrieve user data from the database for email ${email}: ${JSON.stringify(
            error
          )}`
        )

        return new DatabaseError(
          "Error occurred while retrieving user data from the database"
        )
      }
    )
      .andThen((user) => {
        if (!user) {
          logger.warn(`Email address ${email} is not registered on Isomer CMS`)

          return errAsync(
            new ForbiddenError("Email address is not registered on Isomer CMS")
          )
        }

        return okAsync(user)
      })
      .andThen((user) =>
        // Step 2: Check if the user is a collaborator of ALL given repos
        ResultAsync.combine([
          okAsync<User, never>(user),
          ...repoNames.map((repoName) =>
            ResultAsync.fromPromise(
              this.collaboratorsService.getRole(repoName, user.id.toString()),
              () =>
                new DatabaseError(
                  `Error retrieving user's role for the repo ${repoName}`
                )
            )
          ),
        ])
      )
      .andThen(([user, ...roles]) => {
        const isUserNotAdminCollaborator = roles.some(
          (role) =>
            !role ||
            (role !== CollaboratorRoles.Admin &&
              role !== CollaboratorRoles.IsomerAdmin)
        )

        if (isUserNotAdminCollaborator) {
          logger.warn(
            `User ${email} is not an admin collaborator of all the given repos ${JSON.stringify(
              repoNames
            )}`
          )

          return errAsync(
            new ForbiddenError(
              "User is not an admin collaborator of all the given repos"
            )
          )
        }

        return okAsync(user)
      })
      .andThen((user) =>
        // Step 3: Obtain a token for the user
        ResultAsync.combine([
          okAsync(user),
          tokenServiceInstance.getAccessToken(),
        ])
      )
      .andThen(([user, accessToken]) =>
        // Step 4: Construct a fake user session data object and get audit logs
        ResultAsync.combine(
          repoNames.map((repoName) => {
            const userSessionData = new UserWithSiteSessionData({
              githubId: "isomeradmin", // Fake GitHub ID, no real need for this here
              accessToken,
              isomerUserId: user.id.toString(),
              email,
              siteName: repoName,
            })

            return this.getAuditLogs(userSessionData, sinceDate, untilDate).map(
              (auditLogs) => ({
                siteName: repoName,
                auditLogs,
                snapshotTime: new Date(),
              })
            )
          })
        )
      )
      .andThen((auditLogDtos) => {
        // Step 5: Prepare the audit log CSV files for each repo
        const auditLogHeaders = [
          "Date",
          "Time (UTC)",
          "Activity",
          "User",
          "Page",
          "Remarks",
          "Link",
        ]

        return ResultAsync.combine(
          auditLogDtos.map(({ siteName, auditLogs, snapshotTime }) => {
            const csvContent = auditLogs.map(
              ({ timestamp, activity, actor, page, remarks, link }) => {
                const recordDate = timestamp.toISOString().split("T")[0]
                const recordHour = timestamp
                  .getUTCHours()
                  .toString()
                  .padStart(2, "0")
                const recordMinute = timestamp
                  .getUTCMinutes()
                  .toString()
                  .padStart(2, "0")
                const recordSecond = timestamp
                  .getUTCSeconds()
                  .toString()
                  .padStart(2, "0")
                const recordTime = `${recordHour}:${recordMinute}:${recordSecond}`

                return [
                  recordDate,
                  recordTime,
                  activity,
                  actor,
                  page,
                  remarks,
                  link,
                ]
              }
            )
            const csvFileDate = snapshotTime.toISOString().split("T")[0]
            const csvFileName = `audit-logs_${siteName}_${csvFileDate}_${formSubmissionId}.csv`
            const csvFilePath = path.join(EFS_VOL_PATH_AUDIT_LOGS, csvFileName)

            return ResultAsync.fromPromise(
              fs.promises.writeFile(
                csvFilePath,
                Papa.unparse({
                  fields: auditLogHeaders,
                  data: csvContent,
                }),
                "utf-8"
              ),
              (error) => {
                logger.error(
                  `Site audit log error: Unable to write audit log CSV file for repo ${siteName}: ${JSON.stringify(
                    error
                  )}`
                )
                return new AuditLogsError(
                  `Unable to write audit log CSV file for repo ${siteName}`
                )
              }
            ).map(() => csvFilePath)
          })
        )
      })
      .andThen((csvFilePaths) => {
        // Step 6: Send the audit log CSV files to the user via email
        const emailBody = `<p>Please find the attached audit log CSV files for the requested repos:</p>
        <ul>
          ${repoNames.map((repoName) => `<li>${repoName}</li>`)}
        </ul>
        <p>Isomer Support Team</p>`

        return ResultAsync.fromPromise(
          mailer.sendMail(email, emailSubject, emailBody, csvFilePaths),
          () =>
            new AuditLogsError(
              `Error occurred while sending audit log CSV files to ${email} (submission ID: ${formSubmissionId}). Requested repos: ${repoNames.join(
                ", "
              )}`
            )
        )
      })
      .orElse((error) => {
        const emailBody = `<p>An error occurred when getting the audit log CSV files for the requested repos:</p>
        <ul>
          ${repoNames.map((repoName) => `<li>${repoName}</li>`)}
        </ul>
        <p>This was the error that was received:</p>
        <p>${JSON.stringify(error)}</p>
        <p>Isomer Support Team</p>`

        return ResultAsync.fromPromise(
          mailer.sendMail(email, emailSubject, emailBody),
          () =>
            new AuditLogsError(
              `Error occurred while sending an error email to ${email} (submission ID: ${formSubmissionId}). Requested repos: ${repoNames.join(
                ", "
              )}`
            )
        )
      })
  }
}

export default AuditLogsService
