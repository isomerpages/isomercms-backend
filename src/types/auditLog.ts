export const AuditableActivityNames = {
  SavedChanges: "Saved Changes",
  PublishedChanges: "Published Changes",
  RequestedReview: "Requested Review",
  ApprovedReview: "Approved Review",
  CancelledReview: "Cancelled Review",
  AddedCollaborator: "Added Collaborator",
  RemovedCollaborator: "Removed Collaborator",
} as const

export type AuditableActivity = keyof typeof AuditableActivityNames

export type AuditLog = {
  timestamp: Date
  activity: typeof AuditableActivityNames[AuditableActivity]
  actor: string
  page: string
  remarks: string
}
