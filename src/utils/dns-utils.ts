import dns from "node:dns/promises"

import { err, ok, okAsync, Result, ResultAsync } from "neverthrow"

import {
  DNS_CNAME_SUFFIXES,
  DNS_INDIRECTION_DOMAIN,
  DNS_KEYCDN_SUFFIX,
  REDIRECTION_SERVER_IPS,
} from "@root/constants"
import logger from "@root/logger/logger"

export function checkCname(domain: string) {
  return ResultAsync.fromPromise(dns.resolveCname(domain), () => {
    logger.error({
      message: "Error resolving CNAME",
      meta: { domain, method: "checkCname" },
    })
    return new Error()
  })
    .andThen((cname) => {
      if (!cname || cname.length === 0) {
        return okAsync(null)
      }

      return okAsync(cname[0])
    })
    .orElse(() => okAsync(null))
}

export function checkA(domain: string) {
  return ResultAsync.fromPromise(dns.resolve4(domain), () => {
    logger.error({
      message: "Error resolving A record",
      meta: { domain, method: "checkA" },
    })
    return new Error()
  })
    .andThen((a) => {
      if (!a || a.length === 0) {
        return okAsync(null)
      }

      return okAsync(a)
    })
    .orElse(() => okAsync(null))
}

export default function getDnsCheckerMessage(
  domain: string,
  cnameDomain: string | null,
  redirectionDomain: string,
  cnameRecord: string | null,
  indirectionDomain: string,
  intermediateRecords: string[] | null,
  redirectionRecords: string[] | null
): Result<string, string> {
  // Domain has a CNAME pointing to one of our known suffixes
  const isDomainCnameCorrect =
    !!cnameRecord &&
    (cnameRecord.endsWith(`.${DNS_INDIRECTION_DOMAIN}`) ||
      DNS_CNAME_SUFFIXES.some((suffix) => cnameRecord.endsWith(`.${suffix}`)))

  // Domain is directly pointing to our indirection layer
  const isDomainOnIndirection =
    cnameRecord && cnameRecord.endsWith(`.${DNS_INDIRECTION_DOMAIN}`)

  // The intermediate layer (indirection or CNAME) is resolving to valid IPs
  // If on KeyCDN, then there should only be 1 IP, otherwise there should be 4
  const isIntermediateValid =
    intermediateRecords &&
    ((cnameRecord &&
      cnameRecord.endsWith(`.${DNS_KEYCDN_SUFFIX}`) &&
      intermediateRecords.length === 1) ||
      (intermediateRecords.length === 4 &&
        (isDomainCnameCorrect ||
          indirectionDomain.endsWith(`.${DNS_INDIRECTION_DOMAIN}`))))

  // The redirection domain has records that are all resolving to our known IPs
  const isRedirectionValid =
    redirectionRecords &&
    redirectionRecords.every((ip) => REDIRECTION_SERVER_IPS.includes(ip))

  if (isDomainCnameCorrect && cnameDomain && !cnameDomain.startsWith("www.")) {
    // Domain is a CNAME domain and does not have www in it -> No redirection domain to check
    if (isDomainOnIndirection) {
      if (isIntermediateValid) {
        return ok(`The domain ${domain} is *all valid*!`)
      }
      return err(
        `Jialat, the domain \`${domain}\` is correctly pointing to our indirection layer, but the indirection layer does not seem to be configured correctly.\nThis is *OUR* fault`
      )
    }
    return err(
      `Hmm, the domain ${domain} is *valid*, but it points to ${cnameRecord} which is not something that I recognise. Probably not an Isomer site?\n-   A records checker: https://dnschecker.org/#A/${domain}\n-   CNAME records checker: https://dnschecker.org/#CNAME/${domain}`
    )
  }
  if (isDomainCnameCorrect && cnameDomain && cnameDomain.startsWith("www.")) {
    // Domain is a CNAME domain and also starts with www -> Check the apex domain as well
    if (isDomainOnIndirection) {
      if (isIntermediateValid && isRedirectionValid) {
        return ok(
          `The domain ${domain} is *all valid*! The apex domain \`${redirectionDomain}\` is also correctly configured to our redirection service.`
        )
      }
      if (isIntermediateValid && !isRedirectionValid) {
        return err(
          `Weird eh, the domain \`${domain}\` is correctly pointing to our indirection layer but the apex domain is not configured correctly.\nThis is *AGENCY fault*!`
        )
      }
      if (!isIntermediateValid && isRedirectionValid) {
        return err(
          `Jialat, the domain \`${domain}\` is correctly pointing to our indirection layer and the apex domain is correctly configured, but the indirection layer does not seem to be configured correctly.\nThis is *OUR fault*!`
        )
      }
      return err(
        `Wah, the domain \`${domain}\` is correctly pointing to our indirection layer, but both the indirection layer and the apex domain does not seem to be configured correctly.\nThis is *both OUR and AGENCY fault*!`
      )
    }
    if (isIntermediateValid && isRedirectionValid) {
      return err(
        `The domain ${domain} is *all valid*! Although it is directly pointing to our CDN hosting provider and not the indirection layer. The apex domain \`${redirectionDomain}\` is also correctly configured to our redirection service.`
      )
    }
    if (isIntermediateValid && !isRedirectionValid) {
      return err(
        `Weird eh, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer) but the apex domain is not configured correctly.\nThis is *AGENCY fault*!`
      )
    }
    if (!isIntermediateValid && isRedirectionValid) {
      return err(
        `Jialat, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer) and the apex domain is correctly configured, but the CDN hosting provider does not seem to be configured correctly.\nThis is *OUR fault*!`
      )
    }
    return err(
      `Wah, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer), but both the CDN hosting provider and the apex domain does not seem to be configured correctly.\nThis is *both OUR and AGENCY fault*!`
    )
  }
  if (isIntermediateValid) {
    // Domain is likely gone or points directly to A records, but our indirection layer is still correct
    return err(
      `Oh no, the domain \`${domain}\` seems to be gone, but okay lah our indirection layer is correctly configured.\nThis is *AGENCY fault*!`
    )
  }
  if (!cnameRecord && !intermediateRecords && !redirectionRecords) {
    // Everything is gone
    return err(
      `Jialat, the DNS for \`${domain}\` seems to be gone, and our indirection layer does not seem to be configured correctly.\nIf this site is supposed to be live, then this is *both OUR and AGENCY fault*!`
    )
  }
  // Some weird configuration

  let responseMeta = `Wah, I don't know how to handle \`${domain}\` sia, might need to manually check.\n-   A records checker: https://dnschecker.org/#A/${domain}\n-   CNAME records checker: https://dnschecker.org/#CNAME/${domain}\n-   \`${domain}\` points to ${
    cnameRecord ? `\`${cnameRecord}\`` : "no CNAME records"
  }`

  if (cnameRecord || indirectionDomain) {
    responseMeta += `-   \`${cnameRecord || indirectionDomain}\` points to ${
      intermediateRecords ? `\`${intermediateRecords.join(", ")}\`` : "nothing"
    }`
  }

  if (redirectionDomain !== cnameDomain) {
    responseMeta += `-   \`${redirectionDomain}\` points to ${
      redirectionRecords
        ? `\`${redirectionRecords.join(", ")}\``
        : "no A records"
    }`
  }
  return err(responseMeta)
}

export function dnsMonitor(domain: string): ResultAsync<string, string> {
  return checkCname(domain)
    .andThen((cname) => {
      // Original domain does not have a CNAME record, check if the www
      // version has a valid CNAME record
      if (!cname && !domain.startsWith("www.")) {
        const cnameDomain = `www.${domain}`
        return ResultAsync.combine([
          okAsync(cnameDomain),
          checkCname(cnameDomain),
        ])
      }

      return ResultAsync.combine([okAsync(domain), okAsync(cname)])
    })
    .andThen(([cnameDomain, cnameRecord]) => {
      // Original and www version of the domain do not have a CNAME record,
      // check if our indirection domain is still correct
      if (!cnameRecord) {
        const indirectionDomain = domain.startsWith("www.")
          ? `${domain.slice(4).replaceAll(".", "-")}.${DNS_INDIRECTION_DOMAIN}`
          : `${domain.replaceAll(".", "-")}.${DNS_INDIRECTION_DOMAIN}`

        return ResultAsync.combine([
          okAsync({
            cnameDomain: null,
            cnameRecord,
            indirectionDomain,
          }),
          checkA(indirectionDomain),
        ])
      }

      // Either the original or www version of the domain has a CNAME record,
      // check if the CNAME record is valid
      return ResultAsync.combine([
        okAsync({
          cnameDomain,
          cnameRecord,
          indirectionDomain: cnameRecord,
        }),
        checkA(cnameRecord),
      ])
    })
    .andThen(
      ([
        { cnameDomain, cnameRecord, indirectionDomain },
        indirectionRecords,
      ]) => {
        const redirectionDomain = domain.startsWith("www.")
          ? domain.slice(4)
          : domain

        return ResultAsync.combine([
          okAsync({
            cnameDomain,
            cnameRecord,
            indirectionDomain,
            indirectionRecords,
            redirectionDomain,
          }),
          checkA(redirectionDomain),
        ])
      }
    )
    .andThen(
      ([
        {
          cnameDomain,
          cnameRecord,
          indirectionDomain,
          indirectionRecords,
          redirectionDomain,
        },
        redirection,
      ]) =>
        getDnsCheckerMessage(
          domain,
          cnameDomain,
          redirectionDomain,
          cnameRecord,
          indirectionDomain,
          indirectionRecords,
          redirection
        )
    )
}
