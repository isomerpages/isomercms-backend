export type ItemType = "dir" | "file"

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
  mediaType: string
  isPrivate: boolean
}

export interface MediaFileOutput {
  name: string
  sha: string
  mediaUrl: string
  mediaPath: string
  type: ItemType
}
