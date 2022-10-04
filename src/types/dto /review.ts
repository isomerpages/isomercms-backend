export type FileType = "page" | "nav" | "setting" | "file" | "image"

export interface EditedItemDto {
  type: FileType[]
  name: string
  path: string[]
  url: string
  lastEditedBy: string
  lastEditedTime: number
}
