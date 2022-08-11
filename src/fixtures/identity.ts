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

const mockCollaboratorContributor1 = {
  id: "1",
  email: "test1@test.gov.sg",
  githubId: "test1",
  contactNumber: "12331231",
  lastLoggedIn: "2022-07-30T07:41:09.661Z",
  createdAt: "2022-04-04T07:25:41.013Z",
  updatedAt: "2022-07-30T07:41:09.662Z",
  deletedAt: null,
  SiteMember: {
    userId: "1",
    siteId: "16",
    role: "CONTRIBUTOR",
    createdAt: "2022-07-29T03:50:49.145Z",
    updatedAt: "2022-07-29T03:50:49.145Z",
  },
}

const mockCollaboratorAdmin1 = {
  id: "2",
  email: "test2@test.gov.sg",
  githubId: "test2",
  contactNumber: "12331232",
  lastLoggedIn: "2022-07-30T07:41:09.661Z",
  createdAt: "2022-04-04T07:25:41.013Z",
  updatedAt: "2022-07-30T07:41:09.662Z",
  deletedAt: null,
  SiteMember: {
    userId: "2",
    siteId: "16",
    role: "ADMIN",
    createdAt: "2022-07-29T03:50:49.145Z",
    updatedAt: "2022-07-29T03:50:49.145Z",
  },
}
const mockCollaboratorAdmin2 = {
  id: "3",
  email: "test3@test.gov.sg",
  githubId: "test3",
  contactNumber: "12331233",
  lastLoggedIn: "2022-06-30T07:41:09.661Z",
  createdAt: "2022-04-04T07:25:41.013Z",
  updatedAt: "2022-07-30T07:41:09.662Z",
  deletedAt: null,
  SiteMember: {
    userId: "3",
    siteId: "16",
    role: "ADMIN",
    createdAt: "2022-07-29T03:50:49.145Z",
    updatedAt: "2022-07-29T03:50:49.145Z",
  },
}
const mockCollaboratorContributor2 = {
  id: "4",
  email: "test4@test.gov.sg",
  githubId: "test4",
  contactNumber: "12331234",
  lastLoggedIn: "2022-07-30T07:41:09.661Z",
  createdAt: "2022-04-04T07:25:41.013Z",
  updatedAt: "2022-07-30T07:41:09.662Z",
  deletedAt: null,
  SiteMember: {
    userId: "4",
    siteId: "16",
    role: "CONTRIBUTOR",
    createdAt: "2022-07-29T03:50:49.145Z",
    updatedAt: "2022-07-29T03:50:49.145Z",
  },
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
  users: unsortedMockCollaboratorsList,
}
export const mockSiteOrmResponseWithOneAdminCollaborator = {
  id: 1,
  name: "",
  users: [mockCollaboratorAdmin1],
}
export const mockSiteOrmResponseWithOneContributorCollaborator = {
  id: 1,
  name: "",
  users: [mockCollaboratorContributor2],
}
export const mockSiteOrmResponseWithNoCollaborators = {
  id: 1,
  name: "",
}
