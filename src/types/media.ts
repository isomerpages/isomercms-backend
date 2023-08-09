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
