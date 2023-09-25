/* eslint-disable import/prefer-default-export */
import axios from "axios"
import express from "express"

// this is a mock func for now to simulate the delay in getting the repo name
function getRepoNameFromId(id: string) {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve("kishore-test-dev-gh")
    }, 1000)
  })
}

export class FileStorageRouter {
  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/files/:id-:fileName", this.handleGetFileRequest)

    router.get("/images/:id-:imageName", this.handleGetImageRequest)

    return router
  }

  async handleGetImageRequest(req: any, res: any) {
    console.log(req.params.imageName)
    console.log(req.params.id)
    const repoName = await getRepoNameFromId(req.params.id)
    console.log({ repoName })
    const url = `https://raw.githubusercontent.com/isomerpages/${repoName}/staging/images/${req.params.imageName}`
    let mimeType = req.params.imageName.split(".").pop()
    if (mimeType === "svg") {
      mimeType = "svg+xml"
    }
    console.log(mimeType)
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        responseEncoding: "base64",
      })
      const base64Content = Buffer.from(response.data, "base64")
      res.writeHead(200, {
        "Content-Type": `image/${mimeType}`,
        "Content-Length": base64Content.length,
      })
      res.end(base64Content)
    } catch (error) {
      console.error(error)
      res.status(500).send("Error fetching image")
    }
  }

  async handleGetFileRequest(req: any, res: any) {
    const repoName = getRepoNameFromId(req.params.id)
    console.log(repoName)
    const url = `https://raw.githubusercontent.com/isomerpages/${repoName}/staging/files/${req.params.fileName}`
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        responseEncoding: "base64",
      })
      const base64Content = Buffer.from(response.data, "base64")
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": base64Content.length,
      })
      res.end(base64Content)
    } catch (error) {
      console.error(error)
      res.status(500).send("Error fetching image")
    }
  }
}
