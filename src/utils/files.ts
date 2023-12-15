import _ from "lodash"
import { Result, err, ok } from "neverthrow"

import { GIT_SYSTEM_DIRECTORY, PLACEHOLDER_FILE_NAME } from "@root/constants"
import EmptyStringError from "@root/errors/EmptyStringError"
import type {
  DirectoryContents,
  GitDirectoryItem,
} from "@root/types/gitfilesystem"
import { PathInfo } from "@root/types/util"

export const getFileExt = (fileName: string): string =>
  // NOTE: will never be `undefined` as `fileName` is guaranteed to be a string
  fileName.split(".").pop()!

export const extractPathInfo = (
  pageName: string
): Result<PathInfo, EmptyStringError> => {
  if (!pageName) {
    return err(new EmptyStringError())
  }

  const fullPath = pageName.split("/")
  // NOTE: Name is guaranteed to exist
  // as this method only accepts a string
  // and we've validated that the string is not empty
  const name = fullPath.pop()!

  if (fullPath.length === 0) {
    return ok({
      name,
      path: err([]),
      __kind: "PathInfo",
    })
  }

  return ok({
    name,
    path: ok(fullPath),
    __kind: "PathInfo",
  })
}

export const getPaginatedDirectoryContents = (
  directoryContents: GitDirectoryItem[],
  page: number,
  limit = 15,
  search = ""
): DirectoryContents => {
  const subdirectories = directoryContents.filter(
    (item) => item.type === "dir" && item.name !== GIT_SYSTEM_DIRECTORY
  )
  const files = directoryContents.filter(
    (item) => item.type === "file" && item.name !== PLACEHOLDER_FILE_NAME
  )

  let sortedFiles = _(files)
    // Note: We are sorting by name here to maintain compatibility for
    // GitHub-login users, since it is very expensive to get the addedTime for
    // each file from the GitHub API. The files will be sorted by addedTime in
    // milliseconds for GGS users, so they will never see the alphabetical
    // sorting.
    .orderBy(
      [(file) => file.addedTime, (file) => file.name.toLowerCase()],
      ["desc", "asc"]
    )

  if (search) {
    sortedFiles = sortedFiles.filter((file) =>
      file.name.toLowerCase().includes(search.toLowerCase())
    )
  }
  const totalLength = sortedFiles.value().length

  const paginatedFiles =
    limit === 0
      ? sortedFiles.value()
      : sortedFiles
          .drop(page * limit)
          .take(limit)
          .value()

  return {
    directories: subdirectories,
    files: paginatedFiles,
    total: totalLength,
  }
}
