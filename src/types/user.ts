export const UserTypes = {
  Email: "email",
  Github: "github",
} as const

export type UserType = typeof UserTypes[keyof typeof UserTypes]
