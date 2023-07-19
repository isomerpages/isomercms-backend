import { AxiosError } from "axios"

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status: number) =>
  (status >= 200 && status < 300) || status === 404

const isAxiosError = (err: unknown): err is AxiosError =>
  (err as AxiosError).isAxiosError

export { validateStatus, isAxiosError }
