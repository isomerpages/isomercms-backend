import { Attributes } from "sequelize/types"

import { Deployment, Repo, Site, SiteMember } from "@database/models"
import { CollaboratorRoles, JobStatus, SiteStatus } from "@root/constants"

import {
  MOCK_USER_ID_FOUR,
  MOCK_USER_ID_ONE,
  MOCK_USER_ID_THREE,
  MOCK_USER_ID_TWO,
} from "./users"

export const MOCK_SITE_ID_ONE = 1
export const MOCK_SITE_ID_TWO = 2

export const MOCK_SITE_NAME_ONE = "Human readable site name one"
export const MOCK_SITE_NAME_TWO = "Human readable site name two"

export const MOCK_SITE_DATE_ONE = new Date("2022-09-23T00:00:00Z")
export const MOCK_SITE_DATE_TWO = new Date("2022-09-25T00:00:00Z")

export const MOCK_REPO_NAME_ONE = "repo-name-test-one"
export const MOCK_REPO_NAME_TWO = "repo-name-test-two"

export const MOCK_REPO_URL_ONE = "https://github.com/example/repo-one"
export const MOCK_REPO_URL_TWO = "https://github.com/example/repo-two"

export const MOCK_DEPLOYMENT_PROD_URL_ONE =
  "https://master.gibberishone.amplifyapp.com"
export const MOCK_DEPLOYMENT_PROD_URL_TWO =
  "https://master.gibberishtwo.amplifyapp.com"

export const MOCK_DEPLOYMENT_STAGING_URL_ONE =
  "https://staging.gibberishone.amplifyapp.com"
export const MOCK_DEPLOYMENT_STAGING_URL_TWO =
  "https://staging.gibberishtwo.amplifyapp.com"

export const MOCK_SITE_DBENTRY_ONE: Attributes<Site> = {
  id: MOCK_SITE_ID_ONE,
  name: MOCK_REPO_NAME_ONE,
  apiTokenName: "unused",
  siteStatus: SiteStatus.Launched,
  jobStatus: JobStatus.Ready,
  creatorId: MOCK_USER_ID_ONE,
  createdAt: MOCK_SITE_DATE_ONE,
  updatedAt: MOCK_SITE_DATE_ONE,
}

export const MOCK_SITE_DBENTRY_TWO: Attributes<Site> = {
  id: MOCK_SITE_ID_TWO,
  name: MOCK_REPO_NAME_TWO,
  apiTokenName: "unused",
  siteStatus: SiteStatus.Launched,
  jobStatus: JobStatus.Ready,
  creatorId: MOCK_USER_ID_TWO,
  createdAt: MOCK_SITE_DATE_TWO,
  updatedAt: MOCK_SITE_DATE_TWO,
}

export const MOCK_REPO_DBENTRY_ONE: Attributes<Repo> = {
  id: 1,
  name: MOCK_REPO_NAME_ONE,
  url: MOCK_REPO_URL_ONE,
  siteId: MOCK_SITE_ID_ONE,
  createdAt: MOCK_SITE_DATE_ONE,
  updatedAt: MOCK_SITE_DATE_ONE,
}

export const MOCK_REPO_DBENTRY_TWO: Attributes<Repo> = {
  id: 2,
  name: MOCK_REPO_NAME_TWO,
  url: MOCK_REPO_URL_TWO,
  siteId: MOCK_SITE_ID_TWO,
  createdAt: MOCK_SITE_DATE_TWO,
  updatedAt: MOCK_SITE_DATE_TWO,
}

export const MOCK_DEPLOYMENT_DBENTRY_ONE: Attributes<Deployment> = {
  id: 1,
  siteId: MOCK_SITE_ID_ONE,
  productionUrl: MOCK_DEPLOYMENT_PROD_URL_ONE,
  stagingUrl: MOCK_DEPLOYMENT_STAGING_URL_ONE,
  createdAt: MOCK_SITE_DATE_ONE,
  updatedAt: MOCK_SITE_DATE_ONE,
  hostingId: "1",
}

export const MOCK_DEPLOYMENT_DBENTRY_TWO: Attributes<Deployment> = {
  id: 2,
  siteId: MOCK_SITE_ID_TWO,
  productionUrl: MOCK_DEPLOYMENT_PROD_URL_TWO,
  stagingUrl: MOCK_DEPLOYMENT_STAGING_URL_TWO,
  createdAt: MOCK_SITE_DATE_TWO,
  updatedAt: MOCK_SITE_DATE_TWO,
  hostingId: "1",
}

export const MOCK_SITEMEMBER_DBENTRY_ONE: Attributes<SiteMember> = {
  id: 1,
  userId: MOCK_USER_ID_ONE,
  siteId: MOCK_SITE_ID_ONE,
  role: CollaboratorRoles.Admin,
  createdAt: MOCK_SITE_DATE_ONE,
  updatedAt: MOCK_SITE_DATE_ONE,
}

export const MOCK_SITEMEMBER_DBENTRY_TWO: Attributes<SiteMember> = {
  id: 2,
  userId: MOCK_USER_ID_TWO,
  siteId: MOCK_SITE_ID_ONE,
  role: CollaboratorRoles.Contributor,
  createdAt: MOCK_SITE_DATE_ONE,
  updatedAt: MOCK_SITE_DATE_ONE,
}

export const MOCK_SITEMEMBER_DBENTRY_THREE: Attributes<SiteMember> = {
  id: 3,
  userId: MOCK_USER_ID_THREE,
  siteId: MOCK_SITE_ID_TWO,
  role: CollaboratorRoles.Admin,
  createdAt: MOCK_SITE_DATE_TWO,
  updatedAt: MOCK_SITE_DATE_TWO,
}

export const MOCK_SITEMEMBER_DBENTRY_FOUR: Attributes<SiteMember> = {
  id: 4,
  userId: MOCK_USER_ID_FOUR,
  siteId: MOCK_SITE_ID_TWO,
  role: CollaboratorRoles.Contributor,
  createdAt: MOCK_SITE_DATE_TWO,
  updatedAt: MOCK_SITE_DATE_TWO,
}
