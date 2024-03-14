import DatabaseError from "@root/errors/DatabaseError"
import _AuditLogsService from "@services/admin/AuditLogsService"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import NotificationsService from "@services/identity/NotificationsService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"
import ReviewRequestService from "@services/review/ReviewRequestService"

const MockCollaboratorsService = {
  getRole: jest.fn(),
}

const MockIsomerAdminsService = {
  isUserIsomerAdmin: jest.fn(),
}

const MockNotificationsService = {
  findAllForSite: jest.fn(),
}

const MockReviewRequestService = {
  getReviewRequest: jest.fn(),
}

const MockSitesService = {
  getBySiteName: jest.fn(),
}

const MockUsersService = {
  findById: jest.fn(),
  findByGitHubId: jest.fn(),
  findByEmail: jest.fn(),
}

const AuditLogsService = new _AuditLogsService({
  collaboratorsService: (MockCollaboratorsService as unknown) as CollaboratorsService,
  isomerAdminsService: (MockIsomerAdminsService as unknown) as IsomerAdminsService,
  notificationsService: (MockNotificationsService as unknown) as NotificationsService,
  reviewRequestService: (MockReviewRequestService as unknown) as ReviewRequestService,
  sitesService: (MockSitesService as unknown) as SitesService,
  usersService: (MockUsersService as unknown) as UsersService,
})

describe("AuditLogsService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("getAuditLogActorNameFromId", () => {
    it("should get the correct actor email address for a given user ID", async () => {
      const mockUserEmail = "email@domain.com"

      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(false)
      MockUsersService.findById.mockResolvedValueOnce({
        email: mockUserEmail,
      })

      const result = await AuditLogsService.getAuditLogActorNameFromId("userId")

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(mockUserEmail)
    })

    it("should return an error with false if the user is not found", async () => {
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(false)
      MockUsersService.findById.mockResolvedValueOnce(null)

      const result = await AuditLogsService.getAuditLogActorNameFromId("userId")

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe(false)
    })

    it("should return a DatabaseError if UsersService is not able to get the user", async () => {
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(false)
      MockUsersService.findById.mockRejectedValueOnce(new Error())

      const result = await AuditLogsService.getAuditLogActorNameFromId("userId")

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
    })

    it("should show as Isomer Admin if the user is an Isomer Admin", async () => {
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(true)

      const result = await AuditLogsService.getAuditLogActorNameFromId("userId")

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual("Isomer Admin")
    })

    it("should get the correct actor email address even if IsomerAdminsService is not able to get the user's IsomerAdmin status", async () => {
      const mockUserEmail = "email@domain.com"

      MockIsomerAdminsService.isUserIsomerAdmin.mockRejectedValueOnce(
        new Error()
      )
      MockUsersService.findById.mockResolvedValueOnce({
        email: mockUserEmail,
      })

      const result = await AuditLogsService.getAuditLogActorNameFromId("userId")

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(mockUserEmail)
    })
  })

  describe("getAuditLogActorNameFromGitHubId", () => {
    it("should get the correct actor email address for the given GitHub ID", async () => {
      const mockUserEmail = "email@domain.com"

      MockUsersService.findByGitHubId.mockResolvedValueOnce({
        id: "userId",
        email: mockUserEmail,
      })
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(false)

      const result = await AuditLogsService.getAuditLogActorNameFromGitHubId(
        "githubId"
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(mockUserEmail)
    })

    it("should show as Isomer Admin if the user is an Isomer Admin", async () => {
      MockUsersService.findByGitHubId.mockResolvedValueOnce({
        id: "userId",
      })
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(true)

      const result = await AuditLogsService.getAuditLogActorNameFromGitHubId(
        "githubId"
      )

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual("Isomer Admin")
    })

    it("should return a DatabaseError if IsomerAdminsService is not able to get the user's IsomerAdmin status", async () => {
      MockUsersService.findByGitHubId.mockResolvedValueOnce({
        id: "userId",
      })
      MockIsomerAdminsService.isUserIsomerAdmin.mockRejectedValueOnce(
        new Error()
      )

      const result = await AuditLogsService.getAuditLogActorNameFromGitHubId(
        "userId"
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
    })

    it("should return an error with false if the user is not found", async () => {
      MockUsersService.findByGitHubId.mockResolvedValueOnce(null)
      MockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValueOnce(false)

      const result = await AuditLogsService.getAuditLogActorNameFromGitHubId(
        "githubId"
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe(false)
    })

    it("should return a DatabaseError if UsersService is not able to get the user", async () => {
      MockUsersService.findByGitHubId.mockRejectedValueOnce(new Error())

      const result = await AuditLogsService.getAuditLogActorNameFromGitHubId(
        "githubId"
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
    })
  })
})
