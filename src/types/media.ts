export type ItemType = "dir" | "file"
export type MediaType = "images" | "files"

export interface MediaFile {
  name: string
  type: ItemType
  sha: string
  path: string
}

export interface MediaFileInput {
  file: MediaFile
  siteName: string
  directoryName: string
  mediaType: MediaType
  isPrivate?: boolean
}

export interface MediaFileOutput {
  name: string
  sha: string
  mediaUrl: string
  mediaPath: string
  type: ItemType
}

export interface MediaDirOutput {
  name: string
  type: ItemType
}

export type MediaDirectoryOutput = (MediaDirOutput | MediaFileOutput)[]

export interface ReadMediaDirectoryFromDisk {
  readFromGithub: false
  directoryInfo: {
    directoryName: string
  }
}

export interface ReadMediaDirectoryFromGithub {
  readFromGithub: true
  directoryInfo: {
    directoryName: string
    files: any[]
    mediaType: string
    isPrivate: boolean
  }
}

export type ReadMediaDirectoryInput =
  | ReadMediaDirectoryFromDisk
  | ReadMediaDirectoryFromGithub
