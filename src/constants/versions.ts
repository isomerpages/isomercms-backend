export const VERSIONS = {
  v1: "v1",
  v2: "v2",
} as const

export type VERSION_NUMBERS = typeof VERSIONS[keyof typeof VERSIONS]
