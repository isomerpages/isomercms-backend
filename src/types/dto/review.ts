import { CollaboratorRoles } from "@constants/constants"

export type ReviewRequestStatus = "OPEN" | "APPROVED" | "MERGED" | "CLOSED"

export type FileType = "page" | "nav" | "setting" | "file" | "image"

export interface EditedPageDto {
  type: "page"
  name: string
  path: string[]
  stagingUrl: string
  fileUrl: string
  lastEditedBy: string
  lastEditedTime: number
}

export interface EditedConfigDto {
  type: "nav" | "setting"
}

export type EditedItemDto = EditedPageDto | EditedConfigDto

export interface UserDto {
  email: string
  role: CollaboratorRoles
  id: string
  lastLoggedIn: string
}

export type DashboardReviewRequestDto = {
  id: number
  title: string
  description: string
  author: string
  status: ReviewRequestStatus
  changedFiles: number
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

export interface BlobDiffDto {
  oldValue: string
  newValue: string
}
