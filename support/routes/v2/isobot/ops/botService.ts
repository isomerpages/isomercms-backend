import dns from "node:dns/promises"

import { SlashCommand } from "@slack/bolt"
import { ResultAsync, okAsync } from "neverthrow"

import {
  DNS_CNAME_SUFFIXES,
  DNS_INDIRECTION_DOMAIN,
  DNS_KEYCDN_SUFFIX,
  REDIRECTION_SERVER_IPS,
} from "@root/constants"
import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"
import { DnsCheckerResponse } from "@root/types/dnsChecker"

class BotService {
  whitelistService: WhitelistService

  constructor(whitelistService: WhitelistService) {
    this.whitelistService = whitelistService
  }

  private checkCname(domain: string) {
    return ResultAsync.fromPromise(dns.resolveCname(domain), () => {
      logger.info({
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

  private checkA(domain: string) {
    return ResultAsync.fromPromise(dns.resolve4(domain), () => {
      logger.info({
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

  private getSlackMessage(message: string | string[]): DnsCheckerResponse {
    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: typeof message === "string" ? message : message.join("\n"),
          },
        },
      ],
    }
  }

  public async whitelistEmails(text: string) {
    // Sample user input:
    // email1,expDate email2,expDate
    // email1@xyz.com,2024-06-22 email2@abc.com,2025-01-31
    const rawEmails = text.split(" ")
    const emails = rawEmails.map((email) => {
      const [emailStr, expStr] = email.split(",")
      const expDate = new Date(expStr)
      if (expDate.toString() === "Invalid Date") {
        logger.error({
          message: "Invalid date format when attempting to whitelist emails",
          meta: { expiry: expStr, email: emailStr },
        })
        throw new Error(`Invalid date format: ${expStr}`)
      }
      // Update timing of the expiry to be 16:00:00 +00
      // This is because the TZ of our locale is +8,
      // so this resolves to 12AM of the following day.
      expDate.setUTCHours(16, 0, 0, 0)
      return {
        email: emailStr,
        exp: expDate,
      }
    })
    logger.info({ message: "Whitelisting emails", meta: { emails } })

    await this.whitelistService.addWhitelist(emails)
  }

  getValidatedDomain(domain: string) {
    const DOMAIN_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/

    if (!DOMAIN_NAME_REGEX.test(domain)) {
      return false
    }

    return domain
  }

  getDnsCheckerMessage(
    domain: string,
    cnameDomain: string | null,
    redirectionDomain: string,
    cnameRecord: string | null,
    indirectionDomain: string,
    intermediateRecords: string[] | null,
    redirectionRecords: string[] | null
  ) {
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

    const response = []

    if (
      isDomainCnameCorrect &&
      cnameDomain &&
      !cnameDomain.startsWith("www.")
    ) {
      // Domain is a CNAME domain and does not have www in it -> No redirection domain to check
      if (isDomainOnIndirection) {
        if (isIntermediateValid) {
          response.push(`The domain ${domain} is *all valid*!`)
        } else {
          response.push(
            `Jialat, the domain \`${domain}\` is correctly pointing to our indirection layer, but the indirection layer does not seem to be configured correctly.`
          )
          response.push("This is *OUR* fault!")
        }
      } else {
        response.push(
          `Hmm, the domain ${domain} is *valid*, but it points to ${cnameRecord} which is not something that I recognise. Probably not an Isomer site?`
        )
        response.push(
          `-   A records checker: https://dnschecker.org/#A/${domain}`
        )
        response.push(
          `-   CNAME records checker: https://dnschecker.org/#CNAME/${domain}`
        )
      }
    } else if (
      isDomainCnameCorrect &&
      cnameDomain &&
      cnameDomain.startsWith("www.")
    ) {
      // Domain is a CNAME domain and also starts with www -> Check the apex domain as well
      if (isDomainOnIndirection) {
        if (isIntermediateValid && isRedirectionValid) {
          response.push(
            `The domain ${domain} is *all valid*! The apex domain \`${redirectionDomain}\` is also correctly configured to our redirection service.`
          )
        } else if (isIntermediateValid && !isRedirectionValid) {
          response.push(
            `Weird eh, the domain \`${domain}\` is correctly pointing to our indirection layer but the apex domain is not configured correctly.`
          )
          response.push("This is *AGENCY fault*!")
        } else if (!isIntermediateValid && isRedirectionValid) {
          response.push(
            `Jialat, the domain \`${domain}\` is correctly pointing to our indirection layer and the apex domain is correctly configured, but the indirection layer does not seem to be configured correctly.`
          )
          response.push("This is *OUR fault*!")
        } else {
          response.push(
            `Wah, the domain \`${domain}\` is correctly pointing to our indirection layer, but both the indirection layer and the apex domain does not seem to be configured correctly.`
          )
          response.push("This is *both OUR and AGENCY fault*!")
        }
      } else if (isIntermediateValid && isRedirectionValid) {
        response.push(
          `The domain ${domain} is *all valid*! Although it is directly pointing to our CDN hosting provider and not the indirection layer. The apex domain \`${redirectionDomain}\` is also correctly configured to our redirection service.`
        )
      } else if (isIntermediateValid && !isRedirectionValid) {
        response.push(
          `Weird eh, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer) but the apex domain is not configured correctly.`
        )
        response.push("This is *AGENCY fault*!")
      } else if (!isIntermediateValid && isRedirectionValid) {
        response.push(
          `Jialat, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer) and the apex domain is correctly configured, but the CDN hosting provider does not seem to be configured correctly.`
        )
        response.push("This is *OUR fault*!")
      } else {
        response.push(
          `Wah, the domain \`${domain}\` is correctly pointing to our CDN hosting provider (not indirection layer), but both the CDN hosting provider and the apex domain does not seem to be configured correctly.`
        )
        response.push("This is *both OUR and AGENCY fault*!")
      }
    } else if (isIntermediateValid) {
      // Domain is likely gone or points directly to A records, but our indirection layer is still correct
      response.push(
        `Oh no, the domain \`${domain}\` seems to be gone, but okay lah our indirection layer is correctly configured.`
      )
      response.push("This is *AGENCY fault*!")
    } else if (!cnameRecord && !intermediateRecords && !redirectionRecords) {
      // Everything is gone
      response.push(
        `Jialat, the DNS for \`${domain}\` seems to be gone, and our indirection layer does not seem to be configured correctly.`
      )
      response.push(
        "If this site is supposed to be live, then this is *both OUR and AGENCY fault*!"
      )
    } else {
      // Some weird configuration
      response.push(
        `Wah, I don't know how to handle \`${domain}\` sia, might need to manually check.`
      )
      response.push(
        `-   A records checker: https://dnschecker.org/#A/${domain}`
      )
      response.push(
        `-   CNAME records checker: https://dnschecker.org/#CNAME/${domain}`
      )
    }

    response.push(
      `-   \`${domain}\` points to ${
        cnameRecord ? `\`${cnameRecord}\`` : "no CNAME records"
      }`
    )

    if (cnameRecord || indirectionDomain) {
      response.push(
        `-   \`${cnameRecord || indirectionDomain}\` points to ${
          intermediateRecords
            ? `\`${intermediateRecords.join(", ")}\``
            : "nothing"
        }`
      )
    }

    if (redirectionDomain !== cnameDomain) {
      response.push(
        `-   \`${redirectionDomain}\` points to ${
          redirectionRecords
            ? `\`${redirectionRecords.join(", ")}\``
            : "no A records"
        }`
      )
    }

    return this.getSlackMessage(response)
  }

  dnsChecker(payload: SlashCommand) {
    // Step 1: Get the domain name provided by the user
    const { user_name: user, channel_name: channel, text: domain } = payload
    logger.info({
      message: "DNS check requested",
      meta: {
        method: "dnsChecker",
        user,
        channel,
        domain,
      },
    })

    return this.checkCname(domain)
      .andThen((cname) => {
        // Original domain does not have a CNAME record, check if the www
        // version has a valid CNAME record
        if (!cname && !domain.startsWith("www.")) {
          const cnameDomain = `www.${domain}`
          return ResultAsync.combine([
            okAsync(cnameDomain),
            this.checkCname(cnameDomain),
          ])
        }

        return ResultAsync.combine([okAsync(domain), okAsync(cname)])
      })
      .andThen(([cnameDomain, cnameRecord]) => {
        // Original and www version of the domain do not have a CNAME record,
        // check if our indirection domain is still correct
        if (!cnameRecord) {
          const indirectionDomain = domain.startsWith("www.")
            ? `${domain
                .slice(4)
                .replaceAll(".", "-")}.${DNS_INDIRECTION_DOMAIN}`
            : `${domain.replaceAll(".", "-")}.${DNS_INDIRECTION_DOMAIN}`

          return ResultAsync.combine([
            okAsync({
              cnameDomain: null,
              cnameRecord,
              indirectionDomain,
            }),
            this.checkA(indirectionDomain),
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
          this.checkA(cnameRecord),
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
            this.checkA(redirectionDomain),
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
          okAsync(
            this.getDnsCheckerMessage(
              domain,
              cnameDomain,
              redirectionDomain,
              cnameRecord,
              indirectionDomain,
              indirectionRecords,
              redirection
            )
          )
      )
  }
}

export default BotService
