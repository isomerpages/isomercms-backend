import { Result } from "neverthrow"

interface Brandable {
  kind: string
}

// Converts an object to a branded object with a key of the object
export type ToBrand<
  T extends Brandable & Record<string, unknown>,
  K extends keyof T
> = T[K] & { __kind: T["kind"] }

// Brands a base type (eg: string) so that the base type
// is not assignable to the branded type
export type Brand<T, Branding> = {
  __kind: Branding
} & T

export const Brand = {
  // NOTE: The cast here is required - this type is impossible
  // to obtain normally
  fromString: <U>(base: string): Brand<string, U> => base as Brand<string, U>,
  toString: (branded: Brand<string, unknown>): string =>
    (branded as unknown) as string,
}

export type FileNameBrand<T extends string> = {
  name: string & { __kind: T }
  kind: T
}

/**
 * NOTE: We brand this to prevent ad-hoc creation
 * so that it has to come from the method.
 *
 * The `path` represents the path prefix of a given page
 * and the `name` is the page name itself.
 *
 * This means that, for example, our homepage would be
 * `path: Err([])` as there is no actual path to speak of
 * and the name is `name: index.md`
 *
 * For another page such as `contact-us`,
 * the path would then be `/pages` and the
 * name would be `contact-us.md`
 */
export type PathInfo = Brand<
  {
    name: string
    path: Result<string[], never[]>
  },
  "PathInfo"
>
