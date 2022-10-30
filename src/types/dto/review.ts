import { CollaboratorRoles } from "@constants/constants"

export type ReviewRequestStatus = "OPEN" | "APPROVED" | "MERGED" | "CLOSED"

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
  status: ReviewRequestStatus
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
  status: ReviewRequestStatus
  changedItems: EditedItemDto[]
}

export interface UpdateReviewRequestDto {
  reviewers: string[]
}

export interface CommentItem {
  user: string
  createdAt: number
  message: string
  isRead: boolean
}

export interface GithubCommentData {
  userId: string
  message: string
  createdAt: string
}
