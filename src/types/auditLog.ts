export enum AuditableActivity {
  SavedChanges = "Saved Changes",
  PublishedChanges = "Published Changes",
  RequestedReview = "Requested Review",
  ApprovedReview = "Approved Review",
  CancelledReview = "Cancelled Review",
  AddedCollaborator = "Added Collaborator",
  RemovedCollaborator = "Removed Collaborator",
}

export type AuditLog = {
  timestamp: Date
  activity: AuditableActivity
  actor: string
  page: string
  remarks: string
}
