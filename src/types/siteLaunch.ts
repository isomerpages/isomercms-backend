//! NOTE: Needs to be similar to https://github.com/isomerpages/isomer-infra/blob/main/src/lambdaFunctions/shared/model.ts
//! Any changes to the types here should be reflected there as well
export enum SiteLaunchLambdaType {
  GENERAL_DOMAIN_VALIDATION = "general-domain-validation",
  PRIMARY_DOMAIN_VALIDATION = "primary-domain-validation",
  REDIRECTION_DOMAIN_VALIDATION = "redirection-domain-validation",
}

export enum SiteLaunchLambdaStatus {
  SUCCESS_SITE_LIVE = "success - site live",
  SUCCESS_PROPAGATING = "success - propagating",
  FAILURE_WRONG_CLOUDFRONT_DISTRIBUTION = "failure - wrong cloudfront distribution",
  FAILURE_CLOUDFRONT_ALIAS_CLASH = "failure - cloudfront alias clash",
  PENDING_DURING_SITE_LAUNCH = "pending - during site launch",
  PENDING_PRE_SITE_LAUNCH = "pending - pre site launch",
}

export type SiteLaunchStatus = {
  state: "success" | "failure" | "pending"
  message: keyof typeof SiteLaunchLambdaStatus
}

export interface SiteLaunchMessage {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  indirectionDomain: string
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
  status?: SiteLaunchStatus
  statusMetadata?: string
}

export function isSiteLaunchMessage(obj: unknown): obj is SiteLaunchMessage {
  if (!obj) {
    return false
  }

  const message = obj as SiteLaunchMessage

  return (
    typeof message.repoName === "string" &&
    typeof message.appId === "string" &&
    typeof message.primaryDomainSource === "string" &&
    typeof message.primaryDomainTarget === "string" &&
    typeof message.domainValidationSource === "string" &&
    typeof message.domainValidationTarget === "string" &&
    typeof message.indirectionDomain === "string" &&
    typeof message.requestorEmail === "string" &&
    typeof message.agencyEmail === "string" &&
    (typeof message.githubRedirectionUrl === "undefined" ||
      typeof message.githubRedirectionUrl === "string") &&
    (typeof message.redirectionDomain === "undefined" ||
      (Array.isArray(message.redirectionDomain) &&
        message.redirectionDomain.every(
          (rd) =>
            typeof rd.source === "string" &&
            typeof rd.target === "string" &&
            typeof rd.type === "string"
        ))) &&
    (typeof message.status === "undefined" ||
      (typeof message.status === "object" &&
        typeof message.status.state === "string" &&
        (message.status.state === "success" ||
          message.status.state === "failure" ||
          message.status.state === "pending") &&
        typeof message.status.message === "string" &&
        Object.keys(SiteLaunchLambdaStatus).includes(
          message.status.message as SiteLaunchLambdaStatus
        ))) &&
    (typeof message.statusMetadata === "undefined" ||
      typeof message.statusMetadata === "string")
  )
}
