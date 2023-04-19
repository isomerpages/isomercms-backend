export const Versions = {
  V1: "v1",
  V2: "v2",
} as const

export type VersionNumber = typeof Versions[keyof typeof Versions]
