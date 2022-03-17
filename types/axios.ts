import axios from "axios"

// NOTE: This is a restricted subset of the axios types.
// This is to ensure that all usages of the HTTP verbs can be typed properly
export type AxiosClient = Pick<typeof axios, "get" | "delete" | "post">
