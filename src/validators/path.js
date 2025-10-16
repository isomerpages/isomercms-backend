const path = require("path")

const { z } = require("zod")
const { fromError } = require("zod-validation-error")

class OptionsError extends Error {
  constructor(message) {
    super(message)
    this.name = "OptionsError"
  }
}

const optionsSchema = z.object({
  basePath: z
    .string()
    .refine(
      (basePath) =>
        basePath === path.resolve(basePath) && path.isAbsolute(basePath),
      "The base path must be an absolute path"
    ),
})

const isSafePath = (absPath, basePath) => {
  // check for poison null bytes
  if (absPath.indexOf("\0") !== -1) {
    return false
  }
  // check for backslashes
  if (absPath.indexOf("\\") !== -1) {
    return false
  }

  // check for dot segments, even if they don't normalize to anything
  if (absPath.includes("..")) {
    return false
  }

  // check if the normalized path is within the provided 'safe' base path
  if (path.resolve(basePath, path.relative(basePath, absPath)) !== absPath) {
    return false
  }
  if (absPath.indexOf(basePath) !== 0) {
    return false
  }
  return true
}

const createValidationSchema = (options) =>
  z
    .string()
    // resolve the path relative to the Node process's current working directory
    // since that's what fs operations will be relative to
    .transform((untrustedPath) => path.resolve(untrustedPath))
    // resolvedPath is now an absolute path
    .refine((resolvedPath) => isSafePath(resolvedPath, options.basePath), {
      message: "The provided path is unsafe.",
    })

const toSchema = (options) =>
  z.string().trim().pipe(createValidationSchema(options))

/**
 * Create a schema that validates user-supplied pathnames for filesystem operations.
 *
 * @param options - The options to use for validation
 * @throws {@link OptionsError} If the options are invalid
 * @returns A Zod schema that validates paths.
 *
 * @public
 */
const createPathSchema = (options) => {
  const result = optionsSchema.safeParse(options)
  if (result.success) {
    return toSchema(result.data)
  }
  throw new OptionsError(fromError(result.error).toString())
}

module.exports = {
  createPathSchema,
}
