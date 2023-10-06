/* eslint-disable no-restricted-syntax */
/* eslint-disable import/prefer-default-export */
// create a deploy service class with no dependencies

import { readFileSync, readdirSync, statSync } from "fs"
import * as fs from "fs"
import { join } from "node:path"
import { relative } from "path"

import {
  DeleteObjectsCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import CloudFront from "aws-sdk/clients/cloudfront"
// import fetch from "node-fetch"

import { config } from "@config/config"

const util = require("util")
const exec = util.promisify(require("child_process").exec)

const BUCKET_NAME = "test-build-deploys"

const CLOUDFRONT_DISTRIBUTION_ID = "E3K2904L0E8QZZ"
export class DeployService {
  async deployApp(repoName: string) {
    if (!repoName) return
    const EFS_VOL_PATH = config.get("aws.efs.volPath")
    const BRANCH_REF = config.get("github.branchRef")
    console.log("deploying app")
    // // check if jekyll is already building
    // const await exec("ps aux | grep jekyll")
    //   console.log({ error, stdout, stderr })
    //   if (error) {
    //     console.error(`Failed to check if Jekyll is already building: ${error}`)
    //     return
    //   }
    //   if (stdout.includes("jekyll build")) {
    //     console.log("Jekyll is already building, cutting the process...")
    //     execSync("pkill -f jekyll build")

    //     return
    //   }
    console.log("Jekyll is not building, starting the build process...")

    // create build script
    // execSync(`echo "${bashOutput}" > build.sh`, {
    //   cwd: `${EFS_VOL_PATH}/${repoName}`,
    // })

    // execSync(`bash build.sh`, {
    //   cwd: `${EFS_VOL_PATH}/${repoName}`,
    // })

    /**
     * might need this
     *   export LDFLAGS="-L/opt/homebrew/opt/libffi/lib"
     *     export CPPFLAGS="-I/opt/homebrew/opt/libffi/include"
     */
    // console.log(join(EFS_VOL_PATH, repoName))
    // execSync("bundle install", {
    //   cwd: join(EFS_VOL_PATH, repoName),
    // })

    // execSync("bundle exec jekyll build", {
    //   cwd: join(EFS_VOL_PATH, repoName),
    // })

    // upload to S3
    // const s3Client = new S3Client({
    //   region: "ap-southeast-1",
    // })

    // const existingObjects = await s3Client.send(
    //   new ListObjectsCommand({ Bucket: BUCKET_NAME })
    // )
    // const objectIdentifiers = existingObjects?.Contents?.map((object) => ({
    //   Key: object.Key,
    // }))
    // await s3Client.send(
    //   new DeleteObjectsCommand({
    //     Bucket: BUCKET_NAME,
    //     Delete: { Objects: objectIdentifiers },
    //   })
    // )

    // const sitePath = join(EFS_VOL_PATH, repoName, "_site")
    // console.log(sitePath)

    // const fileUploader = async (relFilePath: string) => {
    //   const files = readdirSync(relFilePath)
    //   console.log(files)
    //   files.forEach(async (file) => {
    //     const filePath = join(relFilePath, file)
    //     const fileStat = statSync(filePath)
    //     if (fileStat.isFile()) {
    //       const fileContent = readFileSync(filePath)
    //       const fileRelativePath = relative(sitePath, filePath)
    //       const uploadParams = {
    //         Bucket: BUCKET_NAME,
    //         Key: fileRelativePath,
    //         Body: fileContent,
    //       }
    //       // eslint-disable-next-line no-await-in-loop
    //       await s3Client.send(new PutObjectCommand(uploadParams))
    //     } else {
    //       fileUploader(join(relFilePath, file))
    //     }
    //   })
    // }
    // fileUploader(sitePath)

    // create a file called isBuilding
    const filePath = `/efs/repos/${repoName}/isBuilding.txt`
    fs.writeFileSync(filePath, "")
    try {
      const responseFromDocker = await exec(
        `curl --location 'http://localhost:3000/build' --header 'Content-Type: application/json' --data '{ "dir": "/efs/repos/${repoName}" }' --max-time 600`
      )
      console.log({ responseFromDocker })
    } catch (error) {
      console.error({ error })
    }

    const poller = setInterval(async () => {
      console.log(`polling for ${filePath}`)
      // Delete the file if it exists
      if (!fs.existsSync(filePath)) {
        console.log(`file does not exist for ${filePath}`)

        // const res = await fetch("http://localhost:3000/build", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     dir: `/efs/repos/${repoName}`,
        //   }),
        // })
        // if (res.status !== 200) {
        //   console.error(":cry")
        //   return
        // }
        // console.log("resp from docker", { res })

        const s3Resp = await exec(
          `aws s3 cp ${join(
            `/efs`,
            `repos`,
            repoName,
            "_site"
          )} s3://test-build-deploys/ --recursive`
        )

        console.log("Uploaded to S3", { s3Resp })

        // // refresh CloudFront distribution
        const cloudFrontClient = new CloudFront({
          region: "us-east-1",
          credentials: {
            accessKeyId: config.get("aws.amplify.accessKeyId"),
            secretAccessKey: config.get("aws.amplify.secretAccessKey"),
          },
        })

        const invalidationParams = {
          DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            CallerReference: `${Date.now()}`,
            Paths: {
              Quantity: 1,
              Items: ["/*"],
            },
          },
        }

        cloudFrontClient.createInvalidation(invalidationParams, (err, data) => {
          console.log({ err, data })
        })
        console.log(
          `Invalidated CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}`
        )
        console.log("clearing poller")
        clearInterval(poller)
      }
    }, 1000)
  }
}
