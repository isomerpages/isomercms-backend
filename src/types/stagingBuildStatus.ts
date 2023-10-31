export const statusStates = {
  pending: "PENDING",
  ready: "READY",
  error: "ERROR",
} as const
export type BuildStatus = typeof statusStates[keyof typeof statusStates]

export interface StagingBuildStatus {
  status: BuildStatus
  timeLastSaved: number
}
