import { Attributes } from "sequelize/types"

import { User, SiteMember } from "@database/models"

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

export const mockBearerTokenHeaders = {
  headers: {
    Authorization: `Bearer ${process.env.POSTMAN_API_KEY}`,
  },
}

const mockCollaboratorContributor1: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 1,
  email: "test1@test.gov.sg",
  githubId: "test1",
  contactNumber: "12331231",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 1,
    siteId: "16",
    role: "CONTRIBUTOR",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}

const mockCollaboratorAdmin1: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 2,
  email: "test2@test.gov.sg",
  githubId: "test2",
  contactNumber: "12331232",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 2,
    siteId: "16",
    role: "ADMIN",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}
const mockCollaboratorAdmin2: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 3,
  email: "test3@test.gov.sg",
  githubId: "test3",
  contactNumber: "12331233",
  lastLoggedIn: new Date("2022-06-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 3,
    siteId: "16",
    role: "ADMIN",
    createdAt: new Date("2022-07-29T03:50:49.145Z"),
    updatedAt: new Date("2022-07-29T03:50:49.145Z"),
  },
  sites: [],
}
const mockCollaboratorContributor2: Attributes<User> & {
  SiteMember: Attributes<SiteMember>
} = {
  id: 4,
  email: "test4@test.gov.sg",
  githubId: "test4",
  contactNumber: "12331234",
  lastLoggedIn: new Date("2022-07-30T07:41:09.661Z"),
  createdAt: new Date("2022-04-04T07:25:41.013Z"),
  updatedAt: new Date("2022-07-30T07:41:09.662Z"),
  deletedAt: undefined,
  SiteMember: {
    userId: 4,
    siteId: "16",
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
export const MOCK_GITHUB_EMAIL_ADDRESS_ONE = "test@example.com"
export const MOCK_GITHUB_DATE_ONE = "2022-09-22T04:07:53Z"
export const MOCK_COMMIT_MESSAGE_OBJECT_ONE = {
  message: MOCK_COMMIT_MESSAGE_ONE,
  fileName: MOCK_COMMIT_FILENAME_ONE,
  userId: mockIsomerUserId,
}

export const MOCK_COMMIT_MESSAGE_TWO = "Update file: Test.md"
export const MOCK_COMMIT_FILENAME_TWO = "Test.md"
export const MOCK_GITHUB_EMAIL_ADDRESS_TWO = "test2@example.com"
export const MOCK_GITHUB_DATE_TWO = "2022-09-28T06:25:14Z"
export const MOCK_COMMIT_MESSAGE_OBJECT_TWO = {
  message: MOCK_COMMIT_MESSAGE_TWO,
  fileName: MOCK_COMMIT_FILENAME_TWO,
  userId: mockIsomerUserId,
}
