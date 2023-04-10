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
