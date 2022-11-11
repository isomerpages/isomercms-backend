export class AmplifyError extends Error {
  appName?: string

  appArn?: string

  appId?: string

  public constructor(
    msg: string,
    appName?: string,
    appId?: string,
    appArn?: string
  ) {
    super(msg)
    this.appName = appName
    this.appArn = appArn
    this.appId = appId
  }
}

export interface AmplifyInfo {
  name: string
  arn: string
  id: string
  defaultDomain: string
  repository: string
}
