import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

export default class S3Service {
  private readonly s3Client: S3Client

  constructor(s3Client: S3Client) {
    this.s3Client = s3Client
  }

  async uploadBlob(bucketName: string, key: string, blob: Uint8Array) {
    try {
      // Set the parameters
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: blob,
      }

      // Upload the file to the bucket
      const data = await this.s3Client.send(new PutObjectCommand(uploadParams))
      console.log("Success", data)
      return data // For example, return the data or promise here if needed
    } catch (err) {
      console.error("Error", err)
      throw err // Rethrow the error for the caller to handle
    }
  }
}
