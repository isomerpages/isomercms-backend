import {
  DecryptParams,
  DecryptedContent,
} from "@opengovsg/formsg-sdk/dist/types"
import { Request, Response, NextFunction } from "express"

import logger from "@logger/logger"

import { AuthError } from "@root/errors/AuthError"

export interface FormsSdk {
  webhooks: {
    authenticate: (header: string, uri: string) => void
  }
  crypto: {
    decrypt: (
      formCreateKey: string,
      decryptParams: DecryptParams
    ) => DecryptedContent | null
  }
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
    if (!signature) {
      throw new AuthError("Signature missing")
    }
    const postUri = `https://${req.get("host")}${req.baseUrl}${req.path}`
    try {
      this.formsg.webhooks.authenticate(signature, postUri)
      // Continue processing the POST body
      next()
    } catch (e) {
      logger.error(e)
      throw new AuthError("Unauthorized")
    }
  }

  decrypt = ({ formKey }: { formKey: string }) => (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const submission = this.formsg.crypto.decrypt(
      formKey,
      // If `verifiedContent` is provided in `req.body.data`, the return object
      // will include a verified key.
      req.body.data
    )

    // If the decryption failed, submission will be `null`.
    if (submission === null) {
      res.status(422).send({ message: "Bad submission" })
    }
    // Continue processing the submission
    res.locals.submission = submission
    next()
  }
}
