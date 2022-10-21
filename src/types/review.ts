import type { User } from "@root/database/models/User"

import { RawFileChangeInfo } from "./github"

export interface FileChangeInfo
  extends Pick<
    RawFileChangeInfo,
    "additions" | "deletions" | "changes" | "status" | "filename"
  > {
  rawUrl: string
}

export interface RequestChangeInfo {
  reviewers: User[]
}
