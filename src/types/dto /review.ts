import { CollaboratorRoles } from "@constants/constants"

export type FileType = "page" | "nav" | "setting" | "file" | "image"

export interface EditedItemDto {
  type: FileType[]
  name: string
  path: string[]
  url: string
  lastEditedBy: string
  lastEditedTime: number
}

export interface UserDto {
  email: string
  role: CollaboratorRoles
}

export type DashboardReviewRequestDto = {
  id: number
  title: string
  description: string
  author: string
  // TODO! - db
  status: "PENDING" | "APPROVED"
  changedFiles: number
  // TODO!
  newComments: number
  firstView: boolean
  createdAt: number // Unix timestamp
}

export interface ReviewRequestDto {
  reviewUrl: string
  title: string
  requestor: string
  reviewers: string[]
  reviewRequestedTime: number
  changedItems: EditedItemDto[]
}
