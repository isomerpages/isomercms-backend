import { err, ok, Result } from "neverthrow"

import PlaceholderParseError from "@root/errors/PlaceholderParseError"
import { PlaceholderFileName } from "@root/types/placeholder"
import { PathInfo, Brand } from "@root/types/util"

export default class PlaceholderService {
  public static isPlaceholderFile(
    pathInfo: PathInfo
  ): Result<PlaceholderFileName, PlaceholderParseError> {
    if (pathInfo.name.endsWith(".keep"))
      return ok(PlaceholderService.extractPlaceholderFileName(pathInfo))
    const rawPath = pathInfo.path.unwrapOr([""]).join("/")
    return err(new PlaceholderParseError(`${rawPath}/${pathInfo.name}`))
  }

  private static extractPlaceholderFileName({
    name: rawName,
    path,
  }: PathInfo): PlaceholderFileName {
    const name = Brand.fromString<"Placeholder">(rawName)
    return {
      name,
      path,
      kind: "Placeholder",
    }
  }
}
