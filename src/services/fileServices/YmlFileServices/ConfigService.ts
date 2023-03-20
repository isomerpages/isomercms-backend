import { err, ok, Result } from "neverthrow"

import ConfigParseError from "@root/errors/ConfigParseError"
import {
  ConfigFileName,
  HtmlConfigFileName,
  YmlConfigFileName,
} from "@root/types/configYml"
import { PathInfo } from "@root/types/pages"
import { Brand } from "@root/types/util"
import { extractPathInfo } from "@root/utils/files"

// eslint-disable-next-line import/prefer-default-export
export class ConfigService {
  isConfigFile = (fileName: string): Result<ConfigFileName, ConfigParseError> =>
    // NOTE: A file can be a config file in a few scenarios:
    // 1. The file's extension is `.yml` (given by jekyll)
    // 2. The file's extension is `.html` + it's rooted in a custom folder
    // The second condition could be made more specific (resource room)
    // but we'd then have an additional dep + require a github api call
    // so we will rely on a less specific condition for now.
    extractPathInfo(fileName).andThen((pathInfo) => {
      if (pathInfo.name.endsWith(".yml"))
        return ok(this.extractYmlConfigFileName(pathInfo))

      return this.isHtmlConfigFile(pathInfo).map((htmlPathInfo) =>
        this.extractHtmlConfigFileName(htmlPathInfo)
      )
    })

  extractYmlConfigFileName = ({
    name: rawName,
    path,
  }: PathInfo): YmlConfigFileName => {
    const name = Brand.fromString<"YmlConfig">(rawName)
    return {
      name,
      path,
      kind: "YmlConfig",
    }
  }

  extractHtmlConfigFileName = ({
    name: rawName,
    path,
  }: PathInfo): HtmlConfigFileName => {
    const name = Brand.fromString<"HtmlConfig">(rawName)

    return {
      name,
      path,
      kind: "HtmlConfig",
    }
  }

  isHtmlConfigFile = (
    pathInfo: PathInfo
  ): Result<PathInfo, ConfigParseError> => {
    const isHtmlConfig =
      pathInfo.name.endsWith("html") &&
      // NOTE: Must not be top-level html
      // and the folder name cannot contain `_`
      // as that implies it is a collection
      // and collections should not contain a `html` file
      pathInfo.path.isOk() &&
      pathInfo.path.value
        .map((folder) => folder.includes("_"))
        .every((hasUnderscore) => !hasUnderscore)

    if (isHtmlConfig) return ok(pathInfo)
    const rawPath = pathInfo.path.isOk() ? pathInfo.path.value : ""
    return err(new ConfigParseError(`${rawPath}/${pathInfo.name}`))
  }
}
