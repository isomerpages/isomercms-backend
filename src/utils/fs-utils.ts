/* eslint-disable import/prefer-default-export */
import * as fs from "fs/promises"

import { ResultAsync, errAsync, okAsync } from "neverthrow"

export function doesDirectoryExist(path: string): ResultAsync<boolean, Error> {
  return ResultAsync.fromPromise(fs.stat(path), (e) => e)
    .map((stat) => stat.isDirectory())
    .orElse((e) => {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        e.code === "ENOENT"
      ) {
        return okAsync(false)
      }
      return errAsync(new Error(`Error occurred when checking directory: ${e}`))
    })
}
