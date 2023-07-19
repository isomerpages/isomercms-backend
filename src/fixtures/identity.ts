import { Attributes } from "sequelize/types"

import { config } from "@config/config"

import { User, SiteMember } from "@database/models"
import { Author } from "@root/types/github"

import { mockIsomerUserId } from "./sessionData"

export const mockRecipient = "hello@world.com"
export const mockSubject = "mock subject"
export const mockBody = "somebody"

export const mockAccessToken = "some token"

export const mockHeaders = {
  headers: {
    Authorization: `token ${mockAccessToken}`,
    "Content-Type": "application/json",
  },
}
export const mockSiteName = "hello world"
export const mockUserId = "some user id"
export const mockSiteId = "16"

export const mockBearerTokenHeaders = {
  headers: {
    Authorization: `Bearer ${config.get("postman.apiKey")}`,
  },
}

export const MOCK_IDENTITY_EMAIL_ONE = "test1@test.gov.sg"
export const MOCK_IDENTITY_EMAIL_TWO = "test2@test.gov.sg"
export const MOCK_IDENTITY_EMAIL_THREE = "test3@test.gov.sg"
export const MOCK_IDENTITY_EMAIL_FOUR = "test4@test.gov.sg"

export const mockCollaboratorContributor1: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 1,
  email: MOCK_IDENTITY_EMAIL_ONE,
  githubId: "test1",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 1,
    siteId: mockSiteId,
    role: "CONTRIBUTOR",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}

export const mockCollaboratorAdmin1: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 2,
  email: MOCK_IDENTITY_EMAIL_TWO,
  githubId: "test2",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 2,
    siteId: mockSiteId,
    role: "ADMIN",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}
export const mockCollaboratorAdmin2: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 3,
  email: MOCK_IDENTITY_EMAIL_THREE,
  githubId: "test3",
  lastLoggedIn: new Date("2022-06-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 3,
    siteId: mockSiteId,
    role: "ADMIN",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}
export const mockCollaboratorContributor2: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 4,
  email: MOCK_IDENTITY_EMAIL_FOUR,
  githubId: "test4",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 4,
    siteId: mockSiteId,
    role: "CONTRIBUTOR",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}

export const unsortedMockCollaboratorsList = [
  mockCollaboratorContributor1,
  mockCollaboratorAdmin1,
  mockCollaboratorAdmin2,
  mockCollaboratorContributor2,
]

export const expectedSortedMockCollaboratorsList = [
  mockCollaboratorAdmin2,
  mockCollaboratorAdmin1,
  mockCollaboratorContributor1,
  mockCollaboratorContributor2,
]

export const mockSiteOrmResponseWithAllCollaborators = {
  id: 1,
  name: "",
  site_members: unsortedMockCollaboratorsList,
}
export const mockSiteOrmResponseWithOneAdminCollaborator = {
  id: 1,
  name: "",
  site_members: [mockCollaboratorAdmin1],
}
export const mockSiteOrmResponseWithOneContributorCollaborator = {
  id: 1,
  name: "",
  site_members: [mockCollaboratorContributor2],
}
export const mockSiteOrmResponseWithNoCollaborators = {
  id: 1,
  site_members: "",
}

export const MOCK_COMMIT_MESSAGE_ONE = "Update file: Example.md"
export const MOCK_COMMIT_FILENAME_ONE = "Example.md"
export const MOCK_COMMIT_FILEPATH_ONE = "test/path/one/"
export const MOCK_GITHUB_NAME_ONE = "testuser"
export const MOCK_GITHUB_EMAIL_ADDRESS_ONE = "test@example.com"
export const MOCK_GITHUB_DATE_ONE = "2022-09-22T04:07:53Z"
export const MOCK_COMMIT_MESSAGE_OBJECT_ONE = {
  message: MOCK_COMMIT_MESSAGE_ONE,
  fileName: MOCK_COMMIT_FILENAME_ONE,
  userId: mockIsomerUserId,
}

export const MOCK_COMMIT_MESSAGE_TWO = "Update file: Test.md"
export const MOCK_COMMIT_FILENAME_TWO = "Test.md"
export const MOCK_COMMIT_FILEPATH_TWO = "test/path/two/"
export const MOCK_GITHUB_NAME_TWO = "testuser2"
export const MOCK_GITHUB_EMAIL_ADDRESS_TWO = "test2@example.com"
export const MOCK_GITHUB_DATE_TWO = "2022-09-28T06:25:14Z"
export const MOCK_COMMIT_MESSAGE_OBJECT_TWO = {
  message: MOCK_COMMIT_MESSAGE_TWO,
  fileName: MOCK_COMMIT_FILENAME_TWO,
  userId: mockIsomerUserId,
}

export const MOCK_COMMIT_MESSAGE_PLACEHOLDER = "Create file: .keep"
export const MOCK_COMMIT_FILENAME_PLACEHOLDER = ".keep"
export const MOCK_COMMIT_FILEPATH_PLACEHOLDER = "test/path/placeholder/"
export const MOCK_GITHUB_NAME_PLACEHOLDER = "testuserplaceholder"
export const MOCK_GITHUB_EMAIL_ADDRESS_PLACEHOLDER =
  "testplaceholder@example.com"
export const MOCK_GITHUB_DATE_PLACEHOLDER = "2022-010-28T06:25:14Z"
export const MOCK_COMMIT_MESSAGE_OBJECT_PLACEHOLDER = {
  message: MOCK_COMMIT_MESSAGE_PLACEHOLDER,
  fileName: MOCK_COMMIT_FILENAME_PLACEHOLDER,
  userId: mockIsomerUserId,
}

export const MOCK_GITHUB_COMMIT_AUTHOR_ONE: Author = {
  name: MOCK_GITHUB_NAME_ONE,
  email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
  date: MOCK_GITHUB_DATE_ONE,
}

export const MOCK_GITHUB_COMMIT_AUTHOR_TWO: Author = {
  name: MOCK_GITHUB_NAME_TWO,
  email: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
  date: MOCK_GITHUB_DATE_TWO,
}

export const MOCK_GITHUB_COMMENT_ONE = "test comment 1"
export const MOCK_GITHUB_COMMENT_DATA_ONE = {
  userId: mockIsomerUserId,
  message: MOCK_GITHUB_COMMENT_ONE,
  createdAt: MOCK_GITHUB_DATE_ONE,
}

export const MOCK_GITHUB_COMMENT_TWO = "test comment 2"
export const MOCK_GITHUB_COMMENT_DATA_TWO = {
  userId: mockIsomerUserId,
  message: MOCK_GITHUB_COMMENT_TWO,
  createdAt: MOCK_GITHUB_DATE_TWO,
}

export const MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME = "isomergithub1"
