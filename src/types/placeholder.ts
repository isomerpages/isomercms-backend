import { PathInfo, FileNameBrand } from "./util"

export type PlaceholderFileName = FileNameBrand<"Placeholder"> & {
  path: PathInfo["path"]
}
