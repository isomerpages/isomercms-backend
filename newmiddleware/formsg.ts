import autoBind from "auto-bind"
import express, { Request, Response, NextFunction } from "express"

import FormSGService from "@root/services/middlewareServices/FormSGService"

export default class FormSGMiddleware {
  formSGService: FormSGService

  constructor({ formSGService }: { formSGService: FormSGService }) {
    this.formSGService = formSGService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  authenticateAndDecrypt = ({
    formKey,
  }: {
    formKey: string
  }): Array<(req: Request, res: Response, next: NextFunction) => void> => [
    this.formSGService.authenticate(),
    express.json(),
    this.formSGService.decrypt({ formKey }),
  ]
}
