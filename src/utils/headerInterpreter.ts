import { Header, HeadersInterpreter } from "axios-cache-interceptor"
import { parse } from "cache-parser"

// NOTE: Taken with reference to https://github.com/arthurfiorette/axios-cache-interceptor/blob/v0.9.2/src/header/interpreter.ts
// The change made is to remove the `maxAge` condition, which is not suitable because
// we want to revalidate on update.
// An alternative is to invalidate the cache on `update` but
// this requires an exhaustive search through our codebase.
// This incurs an extra network call on every update, which is not ideal but in 304
// this is an empty request.
// eslint-disable-next-line import/prefer-default-export
export const headerInterpreter: HeadersInterpreter = (headers) => {
  if (!headers) return "not enough headers"

  const cacheControl = headers[Header.CacheControl]

  if (cacheControl) {
    const { noCache, noStore, mustRevalidate, maxAge, immutable } = parse(
      String(cacheControl)
    )

    // Header told that this response should not be cached.
    if (noCache || noStore) {
      return "dont cache"
    }

    if (immutable) {
      // 1 year is sufficient, as Infinity may cause more problems.
      // It might not be the best way, but a year is better than none.
      return 1000 * 60 * 60 * 24 * 365
    }

    // Already out of date, for cache can be saved, but must be requested again
    if (mustRevalidate || maxAge) {
      return 0
    }
  }

  const expires = headers[Header.Expires]

  if (expires) {
    const milliseconds = Date.parse(String(expires)) - Date.now()
    return milliseconds >= 0 ? milliseconds : "dont cache"
  }

  return "not enough headers"
}
