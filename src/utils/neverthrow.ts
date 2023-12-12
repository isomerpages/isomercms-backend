import { ResultAsync } from "neverthrow"

/**
 * This function is only used when integrating with third party libraries that
 * expect a .catch() method on the returned promise. This should not be used in most
 * control flows as it removes the benefits that neverthrow provides.
 */
const convertNeverThrowToPromise = async <T, E>(
  x: ResultAsync<T, E>
): Promise<T> => {
  const res = await x
  if (res.isErr()) return Promise.reject(res.error)
  return Promise.resolve(res.value)
}

export default convertNeverThrowToPromise
