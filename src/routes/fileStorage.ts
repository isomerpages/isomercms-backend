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

// this is a mock func for now to simulate the delay in getting the staging url
function getStagingUrlFromId(repoName: string) {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(
        "gitless-and-assetless-staging-lite.d29mduhmdpzk5f.amplifyapp.com"
      )
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
    const stagingUrl = await getStagingUrlFromId(repoName)
    console.log(stagingUrl)
    console.log(req.headers["x-forwarded-host"])
    console.log(req.headers["x-forwarded-for"])
    const x = req.headers["x-forwarded-host"]

    //! todo check if forwarded-host iss of type string or array. if array, get the last value (last hop)
    // NOTE: commenting this out this check for speed of development
    // if (req.headers["x-forwarded-host"] !== stagingUrl) {
    //   res.status(403).send("Unauthorized")
    //   return
    // }
    console.log({ repoName })
    console.log("authorized")
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
    console.log(req.headers["x-forwarded-host"])
    const repoName = await getRepoNameFromId(req.params.id)
    const stagingUrl = await getStagingUrlFromId(repoName)
    console.log(typeof req.headers["x-forwarded-host"])
    // NOTE: commenting this out this check for speed of development
    // if (req.headers["x-forwarded-host"] !== stagingUrl) {
    //   res.status(403).send("Unauthorized")
    //   return
    // }
    console.log("authorized")
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
      // console.error(error)
      res.status(500).send("Error fetching image")
    }
  }
}
