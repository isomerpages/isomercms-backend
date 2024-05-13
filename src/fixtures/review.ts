import { Attributes } from "sequelize/types"

import { ReviewRequestStatus } from "@root/constants"
import {
  ReviewComment,
  ReviewMeta,
  ReviewRequest,
  ReviewRequestView,
} from "@root/database/models"
import { Commit, RawPullRequest } from "@root/types/github"

import {
  mockCollaboratorAdmin1,
  mockCollaboratorAdmin2,
  mockCollaboratorContributor1,
  MOCK_COMMIT_FILEPATH_TWO,
  MOCK_COMMIT_MESSAGE_OBJECT_ONE,
  MOCK_COMMIT_MESSAGE_OBJECT_TWO,
  MOCK_GITHUB_COMMIT_AUTHOR_ONE,
  MOCK_GITHUB_COMMIT_AUTHOR_TWO,
  MOCK_GITHUB_DATE_ONE,
  MOCK_COMMIT_FILEPATH_PLACEHOLDER,
  MOCK_COMMIT_FILENAME_ONE,
  MOCK_COMMIT_FILEPATH_ONE,
  MOCK_COMMIT_FILENAME_TWO,
  MOCK_GITHUB_DATE_TWO,
} from "./identity"

export const MOCK_PULL_REQUEST_FILE_FILENAME_ONE = "file1.txt"
export const MOCK_PULL_REQUEST_FILE_CONTENTSURL_ONE =
  "https://api.github.com/repos/octocat/Hello-World/contents/file1.txt?ref=6dcb09b5b57875f334f61aebed695e2e4193db5e"
export const MOCK_PULL_REQUEST_FILE_FILENAME_TWO = "file2.txt"
export const MOCK_PULL_REQUEST_FILE_CONTENTSURL_TWO =
  "https://api.github.com/repos/octocat/Hello-World/contents/file2.txt?ref=bbcd538c8e72b8c175046e27cc8f907076331401"
export const MOCK_PULL_REQUEST_FILE_FILENAME_PLACEHOLDER = ".keep"

export const MOCK_PULL_REQUEST_FILES_CHANGED = [
  MOCK_COMMIT_FILEPATH_ONE + MOCK_COMMIT_FILENAME_ONE,
  MOCK_COMMIT_FILEPATH_TWO + MOCK_COMMIT_FILENAME_TWO,
]

export const MOCK_LATEST_LOG_ONE = {
  hash: "foo",
  date: MOCK_GITHUB_DATE_ONE,
  message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_ONE),
  refs: "refs",
  body: "body",
  author_name: "name",
  author_email: "email",
  diff: {
    files: [{ file: MOCK_COMMIT_FILEPATH_ONE + MOCK_COMMIT_FILENAME_ONE }],
  },
}

export const MOCK_LATEST_LOG_TWO = {
  hash: "foo",
  date: MOCK_GITHUB_DATE_TWO,
  message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_TWO),
  refs: "refs",
  body: "body",
  author_name: "name",
  author_email: "email",
  diff: {
    files: [{ file: MOCK_COMMIT_FILEPATH_TWO + MOCK_COMMIT_FILENAME_TWO }],
  },
}

export const MOCK_LATEST_LOGS = {
  all: [MOCK_LATEST_LOG_ONE, MOCK_LATEST_LOG_TWO],
}

export const MOCK_FILENAME_TO_LATEST_LOG_MAP = {
  [MOCK_PULL_REQUEST_FILES_CHANGED[0]]: MOCK_LATEST_LOG_ONE,
  [MOCK_PULL_REQUEST_FILES_CHANGED[1]]: MOCK_LATEST_LOG_TWO,
}

export const MOCK_PULL_REQUEST_FILECHANGEINFO_ONE = {
  filename: MOCK_PULL_REQUEST_FILE_FILENAME_ONE,
  contents_url: MOCK_PULL_REQUEST_FILE_CONTENTSURL_ONE,
}
export const MOCK_PULL_REQUEST_FILECHANGEINFO_TWO = {
  filename: `${MOCK_COMMIT_FILEPATH_TWO}/${MOCK_PULL_REQUEST_FILE_FILENAME_TWO}`,
  contents_url: MOCK_PULL_REQUEST_FILE_CONTENTSURL_TWO,
}
export const MOCK_PULL_REQUEST_FILECHANGEINFO_PLACEHOLDER = {
  filename: `${MOCK_COMMIT_FILEPATH_PLACEHOLDER}/${MOCK_PULL_REQUEST_FILE_FILENAME_PLACEHOLDER}`,
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

export const MOCK_PULL_REQUEST_TITLE_ONE = "Pull Request 1"
export const MOCK_PULL_REQUEST_BODY_ONE = "Pull Request 1 Description"
export const MOCK_PULL_REQUEST_CHANGED_FILES_ONE = 3

export const MOCK_PULL_REQUEST_ONE: RawPullRequest = {
  title: MOCK_PULL_REQUEST_TITLE_ONE,
  body: MOCK_PULL_REQUEST_BODY_ONE,
  changed_files: MOCK_PULL_REQUEST_CHANGED_FILES_ONE,
  created_at: MOCK_GITHUB_DATE_ONE,
}

export const MOCK_REVIEW_REQUEST_ONE: Attributes<ReviewRequest> = {
  id: 1,
  site: {
    name: "Test Site 1",
    repo: {
      name: "test-repo-1",
    },
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

export const MOCK_REVIEW_REQUEST_META: Attributes<ReviewMeta> = {
  id: 1,
  reviewerId: mockCollaboratorAdmin1.id,
  reviewId: 1,
  pullRequestNumber: 1,
  reviewLink: "fakeUrl",
}

export const MOCK_REVIEW_REQUEST_COMMENT: Attributes<ReviewComment> = {
  id: 1,
  reviewerId: mockCollaboratorAdmin1.id,
  reviewId: 1,
  comment: "fake comment",
}

export const MOCK_REVIEW_REQUEST_VIEW_ONE: Attributes<ReviewRequestView> = {
  id: 1,
  reviewRequestId: 1,
  lastViewedAt: new Date("2022-09-23T00:00:00Z"),
}
