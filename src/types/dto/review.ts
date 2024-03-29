import { CollaboratorRoles } from "@constants/constants"

export type ReviewRequestStatus = "OPEN" | "APPROVED" | "MERGED" | "CLOSED"

export type FileType =
  | "page"
  | "nav"
  | "setting"
  | "file"
  | "image"
  | "placeholder"

export interface BaseEditedItemDto {
  name: string
  path: string[]
  type: FileType
}

export type WithEditMeta<T> = T & {
  lastEditedBy: string
  lastEditedTime: number
}

export interface EditedPageDto extends BaseEditedItemDto {
  type: "page"
  stagingUrl: string
  cmsFileUrl: string
}

export interface EditedConfigDto extends BaseEditedItemDto {
  type: "nav" | "setting"
}

export interface EditedMediaDto extends BaseEditedItemDto {
  type: "file" | "image"
}

export interface EditedPlaceholderDto extends BaseEditedItemDto {
  type: "placeholder"
}

export type EditedItemDto =
  | EditedPageDto
  | EditedConfigDto
  | EditedMediaDto
  | EditedPlaceholderDto

export type DisplayedEditedItemDto = Exclude<
  EditedItemDto,
  EditedPlaceholderDto
>

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
  changedItems: WithEditMeta<DisplayedEditedItemDto>[]
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
