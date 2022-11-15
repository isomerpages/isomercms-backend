import { Attributes } from "sequelize/types"

import { ReviewRequestStatus } from "@root/constants"
import { ReviewRequest, ReviewRequestView } from "@root/database/models"
import { Commit } from "@root/types/github"

import {
  mockCollaboratorAdmin1,
  mockCollaboratorAdmin2,
  mockCollaboratorContributor1,
  mockSiteId,
  MOCK_COMMIT_FILEPATH_TWO,
  MOCK_COMMIT_MESSAGE_OBJECT_ONE,
  MOCK_COMMIT_MESSAGE_OBJECT_TWO,
  MOCK_GITHUB_COMMIT_AUTHOR_ONE,
  MOCK_GITHUB_COMMIT_AUTHOR_TWO,
  MOCK_GITHUB_DATE_ONE,
} from "./identity"

export const MOCK_PULL_REQUEST_FILE_FILENAME_ONE = "file1.txt"
export const MOCK_PULL_REQUEST_FILE_CONTENTSURL_ONE =
  "https://api.github.com/repos/octocat/Hello-World/contents/file1.txt?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e"
export const MOCK_PULL_REQUEST_FILE_FILENAME_TWO = "file2.txt"
export const MOCK_PULL_REQUEST_FILE_CONTENTSURL_TWO =
  "https://api.github.com/repos/octocat/Hello-World/contents/file2.txt?ref=bbcd538c8e72b8c175046e27cc8f907076331401"

export const MOCK_PULL_REQUEST_FILECHANGEINFO_ONE = {
  filename: MOCK_PULL_REQUEST_FILE_FILENAME_ONE,
  contents_url: MOCK_PULL_REQUEST_FILE_CONTENTSURL_ONE,
}
export const MOCK_PULL_REQUEST_FILECHANGEINFO_TWO = {
  filename: `${MOCK_COMMIT_FILEPATH_TWO}/${MOCK_PULL_REQUEST_FILE_FILENAME_TWO}`,
  contents_url: MOCK_PULL_REQUEST_FILE_CONTENTSURL_TWO,
}

export const MOCK_PULL_REQUEST_COMMIT_SHA_ONE =
  "6dcb09b5b57875f334f61aebed695e2e4193db5e"
export const MOCK_PULL_REQUEST_COMMIT_SHA_TWO =
  "bbcd538c8e72b8c175046e27cc8f907076331401"

export const MOCK_PULL_REQUEST_COMMIT_ONE: Commit = {
  sha: MOCK_PULL_REQUEST_COMMIT_SHA_ONE,
  url: "fakeUrl",
  commit: {
    url: "fakeUrl",
    author: MOCK_GITHUB_COMMIT_AUTHOR_ONE,
    message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_ONE),
  },
}
export const MOCK_PULL_REQUEST_COMMIT_TWO: Commit = {
  sha: MOCK_PULL_REQUEST_COMMIT_SHA_TWO,
  url: "fakeUrl",
  commit: {
    url: "fakeUrl",
    author: MOCK_GITHUB_COMMIT_AUTHOR_TWO,
    message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_TWO),
  },
}

export const MOCK_PULL_REQUEST_ONE = {
  title: "Pull Request 1",
  body: "Pull Request 1 Description",
  changed_files: 3,
  created_at: MOCK_GITHUB_DATE_ONE,
}

export const MOCK_REVIEW_REQUEST_ONE: Attributes<ReviewRequest> = {
  id: 1,
  site: {
    name: "Test Site 1",
  },
  requestor: mockCollaboratorContributor1,
  reviewMeta: {
    id: 1,
    pullRequestNumber: 1,
    reviewLink: "fakeUrl",
  },
  reviewStatus: ReviewRequestStatus.Open,
  reviewers: [mockCollaboratorAdmin1, mockCollaboratorAdmin2],
}

export const MOCK_REVIEW_REQUEST_VIEW_ONE: Attributes<ReviewRequestView> = {
  id: 1,
  reviewRequestId: 1,
  lastViewedAt: new Date("2022-09-23T00:00:00Z"),
}
