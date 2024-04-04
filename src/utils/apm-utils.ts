/* eslint-disable import/prefer-default-export */
/**
 * A function to set the name of anonymous methods on an object, all the way into the prototype chain
 * This is useful to be reported in APM traces and spans
 * This is an unconventional thing to do, so we have to disable a couple of eslint rules
 */
export const nameAnonymousMethods = <SelfType extends { [key: string]: any }>(
  self: SelfType
): SelfType => {
  /* eslint-disable no-restricted-syntax */
  /* eslint-disable no-continue */
  for (const methodName in self) {
    if (methodName === "constructor") continue

    const method = self[methodName]
    if (typeof method !== "function") continue
    if (method.name) continue

    Object.defineProperty(method, "name", {
      value: methodName,
      writable: false,
    })
  }
  return self
}
