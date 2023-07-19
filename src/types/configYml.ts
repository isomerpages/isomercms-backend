import { PathInfo, FileNameBrand } from "@root/types/util"

import { ProdPermalink, StagingPermalink } from "./pages"

export type ConfigYmlData = {
  staging?: StagingPermalink
  prod?: ProdPermalink
  "facebook-pixel": string
}

// TODO: make this type of same shape as the PageNames
// as PageNames lacks `path` property at present
export type YmlConfigFileName = FileNameBrand<"YmlConfig"> & {
  path: PathInfo["path"]
}

export type HtmlConfigFileName = FileNameBrand<"HtmlConfig"> & {
  path: PathInfo["path"]
}

export type ConfigFileName = YmlConfigFileName | HtmlConfigFileName
