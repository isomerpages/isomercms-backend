import Crypto from "@opengovsg/formsg-sdk/dist/crypto"
import Webhooks from "@opengovsg/formsg-sdk/dist/webhooks"
import { Request, Response, NextFunction } from "express"

import logger from "@logger/logger"

import { AuthError } from "@errors/AuthError"
import { UnprocessableError } from "@errors/UnprocessableError"

export interface FormsSdk {
  webhooks: Webhooks
  crypto: Crypto
}
export default class FormsProcessingService {
  formsg: FormsSdk

  constructor({ formsg }: { formsg: FormsSdk }) {
    this.formsg = formsg
  }

  authenticate = () => (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    const signature = req.get("X-FormSG-Signature")
    const postUri = `https://${req.get("host")}${req.baseUrl}${req.path}`
    if (!signature) {
      throw new AuthError(`Signature missing for form at ${postUri}`)
    }
    try {
      this.formsg.webhooks.authenticate(signature, postUri)
      // Continue processing the POST body
      next()
    } catch (e) {
      logger.error(JSON.stringify(e))
      throw new AuthError(`Unauthorized form submission at ${postUri}`)
    }
  }

  decrypt = ({ formKey }: { formKey: string }) => async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const submission = await this.formsg.crypto.decryptWithAttachments(
      formKey,
      // If `verifiedContent` is provided in `req.body.data`, the return object
      // will include a verified key.
      req.body.data
    )

    // If the decryption failed, submission will be `null`.
    if (submission === null) {
      const postUri = `https://${req.get("host")}${req.baseUrl}${req.path}`
      throw new UnprocessableError(`Bad formsg submission at ${postUri}`)
    }

    // add created timestamp
    const decryptedPayload = { ...submission, createdAt: req.body.data.created }

    // Continue processing the submission
    res.locals.submission = decryptedPayload
    next()
  }
}
