import { RawFileChangeInfo } from "./github"

export interface FileChangeInfo
  extends Pick<
    RawFileChangeInfo,
    "additions" | "deletions" | "changes" | "status"
  > {
  rawUrl: string
}
