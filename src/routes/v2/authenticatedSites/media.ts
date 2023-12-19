import autoBind from "auto-bind"
import express from "express"

import { BadRequestError } from "@errors/BadRequestError"

import {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} from "@middleware/routeHandler"

import GithubSessionData from "@classes/GithubSessionData"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type {
  MediaDirOutput,
  MediaFileOutput,
  RequestHandler,
} from "@root/types"
import {
  CreateMediaDirectoryRequestSchema,
  CreateMediaFileRequestSchema,
  DeleteMediaFileRequestSchema,
  DeleteMultipleMediaFilesRequestSchema,
  MoveMediaDirectoryFilesRequestSchema,
  RenameMediaDirectoryRequestSchema,
  UpdateMediaFileRequestSchema,
} from "@root/validators/RequestSchema"
import { MediaDirectoryService } from "@services/directoryServices/MediaDirectoryService"
import { MediaFileService } from "@services/fileServices/MdPageServices/MediaFileService"

interface MediaRouterProps {
  mediaFileService: MediaFileService
  mediaDirectoryService: MediaDirectoryService
}

// eslint-disable-next-line import/prefer-default-export
export class MediaRouter {
  private readonly mediaFileService: MediaFileService

  private readonly mediaDirectoryService: MediaDirectoryService

  constructor({ mediaFileService, mediaDirectoryService }: MediaRouterProps) {
    this.mediaFileService = mediaFileService
    this.mediaDirectoryService = mediaDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // List contents of a media directory
  // This includes both files ad subdirectories within the media directory
  listMediaDirectoryContents: RequestHandler<
    { directoryName: string },
    (MediaDirOutput | Pick<MediaFileOutput, "name">)[],
    never,
    { page: number; limit: number },
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { page, limit } = req.query
    const {
      directories,
      files,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page,
        limit,
        search: "",
      }
    )

    return res.status(200).json([...directories, ...files])
  }

  // List files within a media directory
  listMediaDirectoryFiles: RequestHandler<
    { directoryName: string },
    { files: MediaFileOutput[]; total: number },
    never,
    { page: number; limit: number; search: string },
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { page, limit, search } = req.query

    const {
      files,
      total,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page,
        limit,
        search,
      }
    )

    return res.status(200).json({ files, total })
  }

  // List subdirectories within a media directory
  listMediaDirectorySubdirectories: RequestHandler<
    { directoryName: string },
    { directories: MediaDirOutput[] },
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { directoryName } = req.params

    const {
      directories,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page: 0,
        limit: 1,
        search: "",
      }
    )

    return res.status(200).json({ directories })
  }

  // Create a new media directory
  createMediaDirectory: RequestHandler<
    never,
    { newDirectoryName: string },
    { newDirectoryName: string; items: string[] },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { error } = CreateMediaDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const { newDirectoryName, items } = req.body
    const createResp = await this.mediaDirectoryService.createMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName: newDirectoryName,
        objArray: items,
      }
    )

    return res.status(200).json(createResp)
  }

  // Rename a media directory
  renameMediaDirectory: RequestHandler<
    { directoryName: string },
    string,
    { newDirectoryName: string },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = RenameMediaDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const { newDirectoryName } = req.body
    await this.mediaDirectoryService.renameMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
        newDirectoryName,
      }
    )

    return res.status(200).send("OK")
  }

  // Delete a media directory
  deleteMediaDirectory: RequestHandler<
    { directoryName: string },
    string,
    never,
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    await this.mediaDirectoryService.deleteMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
      }
    )
    return res.status(200).send("OK")
  }

  // Move multiple media files
  moveMediaFiles: RequestHandler<
    { directoryName: string },
    string,
    { items: string[]; target: { directoryName: string } },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = MoveMediaDirectoryFilesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const {
      items,
      target: { directoryName: targetDirectoryName },
    } = req.body
    await this.mediaDirectoryService.moveMediaFiles(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
        targetDirectoryName,
        objArray: items,
      }
    )
    return res.status(200).send("OK")
  }

  // Create a new media file
  createMediaFile: RequestHandler<
    { directoryName: string },
    { name: string; content: string; sha: string },
    { content: string; newFileName: string },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = CreateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const { content, newFileName } = req.body
    const createResp = await this.mediaFileService.create(
      userWithSiteSessionData,
      {
        fileName: newFileName,
        directoryName,
        content,
      }
    )

    return res.status(200).json(createResp)
  }

  // Read a media file
  readMediaFile: RequestHandler<
    { directoryName: string; fileName: string },
    MediaFileOutput,
    never,
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const { fileName, directoryName } = req.params

    const readResp = await this.mediaFileService.read(userWithSiteSessionData, {
      fileName,
      directoryName,
    })
    return res.status(200).json(readResp)
  }

  // Update a media file
  updateMediaFile: RequestHandler<
    { directoryName: string; fileName: string },
    | { name: string; oldSha: string; sha: string }
    | { name: string; content: string; oldSha: string; newSha: string },
    { content: string; sha: string; newFileName: string },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { fileName, directoryName } = req.params
    const { error } = UpdateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { content, sha, newFileName } = req.body
    let updateResp
    if (newFileName) {
      updateResp = await this.mediaFileService.rename(
        userWithSiteSessionData,
        githubSessionData,
        {
          oldFileName: fileName,
          newFileName,
          directoryName,
          sha,
        }
      )
    } else {
      updateResp = await this.mediaFileService.update(userWithSiteSessionData, {
        fileName,
        directoryName,
        content,
        sha,
      })
    }
    return res.status(200).json(updateResp)
  }

  // Delete a media file
  deleteMediaFile: RequestHandler<
    { directoryName: string; fileName: string },
    string,
    { sha: string },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const { fileName, directoryName } = req.params
    const { error } = DeleteMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const { sha } = req.body
    await this.mediaFileService.delete(userWithSiteSessionData, {
      fileName,
      directoryName,
      sha,
    })

    return res.status(200).send("OK")
  }

  // Delete multiple media files
  deleteMultipleMediaFiles: RequestHandler<
    never,
    string,
    { items: Array<{ filePath: string; sha: string }> },
    never,
    {
      userWithSiteSessionData: UserWithSiteSessionData
      githubSessionData: GithubSessionData
    }
  > = async (req, res) => {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { items } = req.body
    const { error } = DeleteMultipleMediaFilesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    await this.mediaFileService.deleteMultipleFiles(
      userWithSiteSessionData,
      githubSessionData,
      {
        items,
      }
    )

    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/:directoryName",
      attachReadRouteHandlerWrapper(this.listMediaDirectoryContents)
    )
    router.get(
      "/:directoryName/files",
      attachReadRouteHandlerWrapper(this.listMediaDirectoryFiles)
    )
    router.get(
      "/:directoryName/subdirectories",
      attachReadRouteHandlerWrapper(this.listMediaDirectorySubdirectories)
    )
    router.post(
      "/",
      attachRollbackRouteHandlerWrapper(this.createMediaDirectory)
    )
    router.delete(
      "/",
      attachRollbackRouteHandlerWrapper(this.deleteMultipleMediaFiles)
    )
    router.post(
      "/:directoryName",
      attachRollbackRouteHandlerWrapper(this.renameMediaDirectory)
    )
    router.delete(
      "/:directoryName",
      attachRollbackRouteHandlerWrapper(this.deleteMediaDirectory)
    )
    router.post(
      "/:directoryName/move",
      attachRollbackRouteHandlerWrapper(this.moveMediaFiles)
    )
    router.post(
      "/:directoryName/pages",
      attachRollbackRouteHandlerWrapper(this.createMediaFile)
    )
    router.get(
      "/:directoryName/pages/:fileName",
      attachReadRouteHandlerWrapper(this.readMediaFile)
    )
    router.post(
      "/:directoryName/pages/:fileName",
      attachRollbackRouteHandlerWrapper(this.updateMediaFile)
    )
    router.delete(
      "/:directoryName/pages/:fileName",
      attachRollbackRouteHandlerWrapper(this.deleteMediaFile)
    )

    return router
  }
}
