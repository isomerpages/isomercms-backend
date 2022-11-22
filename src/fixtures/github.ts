import {
  Commit,
  RawComment,
  RawFileChangeInfo,
  RawPullRequest,
} from "@root/types/github"

import { MOCK_USER_ID_ONE, MOCK_USER_ID_TWO } from "./users"

export const MOCK_GITHUB_USER_NAME_ONE = "isomergithub1"
export const MOCK_GITHUB_USER_NAME_TWO = "isomergithub2"

export const MOCK_GITHUB_USER_EMAIL_ONE =
  "111718653+isomergithub1@users.noreply.github.com"
export const MOCK_GITHUB_USER_EMAIL_TWO =
  "111725612+isomergithub2@users.noreply.github.com"

export const MOCK_GITHUB_PULL_REQUEST_NUMBER = 251

// This is one set of commits and file changes which should be used together
export const MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA =
  "a15a7c8b23324f680cd7c5011ca763e36d350f41"
export const MOCK_GITHUB_COMMIT_DATE_ONE = "2022-10-12T06:31:05Z"
export const MOCK_GITHUB_COMMIT_DATE_TWO = "2022-10-13T05:39:43Z"
export const MOCK_GITHUB_COMMIT_DATE_THREE = "2022-11-07T16:32:08Z"
export const MOCK_GITHUB_FILENAME_ALPHA_ONE = "index.md"
export const MOCK_GITHUB_FILEPATH_ALPHA_ONE = ""
export const MOCK_GITHUB_FILENAME_ALPHA_TWO = "Example Title 22.md"
export const MOCK_GITHUB_FILEPATH_ALPHA_TWO = "pages/"
export const MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE = `Update file: ${MOCK_GITHUB_FILENAME_ALPHA_ONE}`
export const MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_TWO = `Update file: ${MOCK_GITHUB_FILENAME_ALPHA_TWO}`
export const MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_ONE = {
  message: MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
  fileName: MOCK_GITHUB_FILENAME_ALPHA_ONE,
  userId: MOCK_USER_ID_ONE,
}
export const MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_TWO = {
  message: MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_TWO,
  fileName: MOCK_GITHUB_FILENAME_ALPHA_TWO,
  userId: MOCK_USER_ID_ONE,
}
export const MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_THREE = {
  message: MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_TWO,
  fileName: MOCK_GITHUB_FILENAME_ALPHA_TWO,
  userId: MOCK_USER_ID_TWO,
}

export const MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_ONE: RawFileChangeInfo = {
  sha: "66804d21ba86f1a193c31714bc15e388c2013a57",
  filename: MOCK_GITHUB_FILENAME_ALPHA_ONE,
  status: "modified",
  additions: 1,
  deletions: 2,
  changes: 3,
  blob_url: `https://github.com/isomerpages/a-test-v4/blob/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}/index.md`,
  raw_url: `https://github.com/isomerpages/a-test-v4/raw/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}/index.md`,
  contents_url: `https://api.github.com/repos/isomerpages/a-test-v4/contents/index.md?ref=${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}`,
}
export const MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_TWO: RawFileChangeInfo = {
  sha: "f04f18eaa8d31fffc9f8cf5020b1f6a765ac225f",
  filename: `${MOCK_GITHUB_FILEPATH_ALPHA_TWO}/${MOCK_GITHUB_FILENAME_ALPHA_TWO}`,
  status: "modified",
  additions: 13,
  deletions: 2,
  changes: 15,
  blob_url: `https://github.com/isomerpages/a-test-v4/blob/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}/pages%2FExample%20Title%2022.md`,
  raw_url: `https://github.com/isomerpages/a-test-v4/raw/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}/pages%2FExample%20Title%2022.md`,
  contents_url: `https://api.github.com/repos/isomerpages/a-test-v4/contents/pages%2FExample%20Title%2022.md?ref=${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}`,
}

export const MOCK_GITHUB_COMMIT_ALPHA_ONE: Commit = {
  url:
    "https://api.github.com/repos/isomerpages/a-test-v4/commits/a79525f0d188880b965053bc0df25a041b476fad",
  sha: "a79525f0d188880b965053bc0df25a041b476fad",
  commit: {
    url:
      "https://api.github.com/repos/isomerpages/a-test-v4/git/commits/a79525f0d188880b965053bc0df25a041b476fad",
    author: {
      name: MOCK_GITHUB_USER_NAME_ONE,
      email: MOCK_GITHUB_USER_EMAIL_ONE,
      date: MOCK_GITHUB_COMMIT_DATE_ONE,
    },
    message: JSON.stringify(MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_ONE),
  },
}
export const MOCK_GITHUB_COMMIT_ALPHA_TWO: Commit = {
  url:
    "https://api.github.com/repos/isomerpages/a-test-v4/commits/ad2b13184f8ee1030636c304737941146bd67f4d",
  sha: "ad2b13184f8ee1030636c304737941146bd67f4d",
  commit: {
    url:
      "https://api.github.com/repos/isomerpages/a-test-v4/git/commits/ad2b13184f8ee1030636c304737941146bd67f4d",
    author: {
      name: MOCK_GITHUB_USER_NAME_TWO,
      email: MOCK_GITHUB_USER_EMAIL_TWO,
      date: MOCK_GITHUB_COMMIT_DATE_TWO,
    },
    message: JSON.stringify(MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_TWO),
  },
}
export const MOCK_GITHUB_COMMIT_ALPHA_THREE: Commit = {
  url: `https://api.github.com/repos/isomerpages/a-test-v4/commits/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}`,
  sha: MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA,
  commit: {
    url: `https://api.github.com/repos/isomerpages/a-test-v4/git/commits/${MOCK_GITHUB_COMMIT_SHA_LATEST_ALPHA}`,
    author: {
      name: MOCK_GITHUB_USER_NAME_ONE,
      email: MOCK_GITHUB_USER_EMAIL_ONE,
      date: MOCK_GITHUB_COMMIT_DATE_THREE,
    },
    message: JSON.stringify(MOCK_GITHUB_COMMIT_MESSAGE_OBJECT_ALPHA_THREE),
  },
}
// end of set

export const MOCK_GITHUB_COMMENT_BODY_ONE = "Comment 1"
export const MOCK_GITHUB_COMMENT_BODY_TWO = "Comment 2"

export const MOCK_GITHUB_COMMENT_OBJECT_ONE = {
  message: MOCK_GITHUB_COMMENT_BODY_ONE,
  fileName: MOCK_GITHUB_FILENAME_ALPHA_ONE,
  userId: MOCK_USER_ID_ONE,
}

export const MOCK_GITHUB_COMMENT_OBJECT_TWO = {
  message: MOCK_GITHUB_COMMENT_BODY_TWO,
  fileName: MOCK_GITHUB_FILENAME_ALPHA_TWO,
  userId: MOCK_USER_ID_TWO,
}

export const MOCK_GITHUB_RAWCOMMENT_ONE: RawComment = {
  body: JSON.stringify(MOCK_GITHUB_COMMENT_OBJECT_ONE),
  created_at: MOCK_GITHUB_COMMIT_DATE_ONE,
}
export const MOCK_GITHUB_RAWCOMMENT_TWO: RawComment = {
  body: JSON.stringify(MOCK_GITHUB_COMMENT_OBJECT_TWO),
  created_at: MOCK_GITHUB_COMMIT_DATE_THREE,
}
