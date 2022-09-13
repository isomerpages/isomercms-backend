export enum JobStatus {
  Ready = "READY", // Ready to run jobs
  Running = "RUNNING", // A job is running
  Failed = "FAILED", // A job has failed and recovery is needed
}

export enum SiteStatus {
  Empty = "EMPTY", // A site record site is being initialized
  Initialized = "INITIALIZED",
  Launched = "LAUNCHED",
}

export const E2E_ISOMER_ID = "-1"
export const E2E_TEST_EMAIL = "test@e2e"
export const E2E_TEST_CONTACT = "12345678"
