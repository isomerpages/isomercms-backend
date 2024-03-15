/* eslint-disable import/prefer-default-export */
import * as fs from "fs/promises"

export async function doesDirectoryExist(path: string): Promise<boolean> {
  let result = false
  try {
    const stat = await fs.stat(path)
    result = stat.isDirectory()
  } catch (e) {
    result = false
  }
  return result
}
