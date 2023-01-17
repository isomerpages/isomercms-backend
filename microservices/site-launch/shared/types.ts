export enum SiteLaunchLambdaType {
  GENERAL_DOMAIN_VALIDATION = "general-domain-validation",
  PRIMARY_DOMAIN_VALIDATION = "primary-domain-validation",
  REDIRECTION_DOMAIN_VALIDATION = "redirection-domain-validation",
}

export enum SiteLaunchLambdaStatus {
  SUCCESS = "success",
  FAILURE = "failure",
  PENDING = "pending",
}

export interface MessageBody {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  requestorEmail: string
  agencyEmail: string
  githubRedirectionUrl?: string
  redirectionDomain?: [
    {
      source: string
      target: string
      type: string
    }
  ]
  status?: SiteLaunchLambdaStatus
  statusMetadata?: string
}
