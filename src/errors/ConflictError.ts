import { BaseIsomerError } from "@errors/BaseError"

export const inputNameConflictErrorMsg = (fileName: string) =>
  `A file with ${fileName} already exists.`

export const protectedFolderConflictErrorMsg = (folderName: string) =>
  `${folderName} is a protected folder name.`

export class ConflictError extends BaseIsomerError {
  constructor(message: string) {
    super({ status: 409, code: "ConflictError", message })
  }
}
