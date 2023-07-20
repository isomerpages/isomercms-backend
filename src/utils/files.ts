import { Result, err, ok } from "neverthrow"

import EmptyStringError from "@root/errors/EmptyStringError"
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
