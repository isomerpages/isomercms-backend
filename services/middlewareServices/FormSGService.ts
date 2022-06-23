import FormSG from "@opengovsg/formsg-sdk"
import { Request, Response, NextFunction } from "express"

import logger from "@logger/logger"

import { AuthError } from "@root/errors/AuthError"

const formsg = FormSG()

export default class FormSGService {
  authenticate = () => (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const signature = req.get("X-FormSG-Signature")
    if (!signature) {
      throw new AuthError("Signature missing")
    }
    const postUri = `https://${req.get("host")}${req.baseUrl}${req.path}`
    try {
      formsg.webhooks.authenticate(signature, postUri)
      // Continue processing the POST body
      next()
    } catch (e) {
      logger?.error(e)
      throw new AuthError("Unauthorized")
    }
  }

  decrypt = ({ formKey }: { formKey: string }) => (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const submission = formsg.crypto.decrypt(
        formKey,
        // If `verifiedContent` is provided in `req.body.data`, the return object
        // will include a verified key.
        req.body.data
      )

      // If the decryption failed, submission will be `null`.
      if (submission) {
        // Continue processing the submission
        res.locals.submission = submission
        next()
      } else {
        res.status(422).send({ message: "Bad submission" })
      }
    } catch (e) {
      logger?.error(e)
      throw new AuthError("Unauthorized")
    }
  }
}
