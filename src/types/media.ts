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
  addedTime: number
  isPrivate?: boolean
}

export interface MediaFileOutput {
  name: string
  sha: string
  mediaUrl: string
  mediaPath: string
  type: ItemType
  addedTime: number
}

export interface MediaDirOutput {
  name: string
  type: ItemType
}
