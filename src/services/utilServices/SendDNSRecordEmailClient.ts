import { groupBy } from "lodash"

import { REDIRECTION_SERVER_IPS } from "@root/constants"
import { DigType } from "@root/types/dig"

export interface DigDNSRecord {
  domain: string
  class: string
  type: DigType
  value: string
}

export interface DnsRecordsEmailProps {
  requesterEmail: string
  repoName: string
  domainValidationSource: string
  domainValidationTarget: string
  primaryDomainSource: string
  primaryDomainTarget: string
  indirectionDomain: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
  quadARecords?: DigDNSRecord[]
  addCAARecord?: boolean
}

export interface LaunchFailureEmailProps {
  // The fields here are optional since a misconfiguration in our
  // formSG can cause some or even all fields to be missing
  requesterEmail?: string
  repoName?: string
  primaryDomain?: string
  error: string
}

const tableStyle =
  "border-collapse: collapse; width: 100%; border: 1px solid #ddd; text-align: center;"

const thStyle = "padding: 8px; text-align: center; border: 1px solid #ddd;"

const tdStyle = "padding: 8px; text-align: left; border: 1px solid #ddd;"

const headerRowStyle =
  "background-color: #f2f2f2; border: 1px solid #ddd; text-align: center;"

const repoNameStyle =
  "padding: 8px; text-align: left; font-weight: bold; border: 1px solid #ddd;"

const bodyTitleStyle = "font-size: 16px; font-weight: bold;"

const bodyFooterStyle = "font-size: 14px;"

export function getDNSRecordsEmailBody(
  submissionId: string,
  dnsRecordsEmailProps: DnsRecordsEmailProps[]
) {
  let html = `<p style="${bodyTitleStyle}">Isomer sites are in the process of launching. (Form submission id [${submissionId}])</p>
      <table style="${tableStyle}">
        <thead>
          <tr style="${headerRowStyle}">
            <th style="${thStyle}">Repo Name</th>
            <th style="${thStyle}">Source</th>
            <th style="${thStyle}">Target</th>
            <th style="${thStyle}">Type</th>
          </tr>
        </thead>
        <tbody>`
  const groupedDnsRecords = groupBy(dnsRecordsEmailProps, "repoName")
  Object.keys(groupedDnsRecords).forEach((repoName) => {
    const hasRedirection = !!groupedDnsRecords[repoName].some(
      (dnsRecords) => !!dnsRecords.redirectionDomainSource
    )

    html += `<tr style="${headerRowStyle}">
          <td style="${repoNameStyle}" rowspan="${
      hasRedirection ? 3 + REDIRECTION_SERVER_IPS.length : 3
    }">${repoName}</td>
        </tr>`
    groupedDnsRecords[repoName].forEach((dnsRecords) => {
      // check if dnsRecords.redirectionDomain is undefined
      html += `
        <tr style="${tdStyle}">

          <td style="${tdStyle}">${dnsRecords.domainValidationSource}</td>
          <td style="${tdStyle}">${dnsRecords.domainValidationTarget}</td>
          <td style="${tdStyle}">CNAME</td>
        </tr>
        <tr style="${tdStyle}">
          <td style="${tdStyle}">${
        hasRedirection
          ? `www.${dnsRecords.primaryDomainSource}`
          : dnsRecords.primaryDomainSource
      }</td>
          <td style="${tdStyle}">${dnsRecords.indirectionDomain}</td>
          <td style="${tdStyle}">CNAME</td>
        </tr>`

      if (hasRedirection) {
        for (let i = 0; i < REDIRECTION_SERVER_IPS.length; i += 1) {
          html += `
          <tr style="${tdStyle}">
            <td style="${tdStyle}">${dnsRecords.primaryDomainSource}</td>
            <td style="${tdStyle}">${REDIRECTION_SERVER_IPS[i]}</td>
            <td style="${tdStyle}">A Record</td>
          </tr>
        `
        }
      }
    })
  })

  html += `
    </tbody>
  </table>`

  Object.keys(groupedDnsRecords).forEach((repoName) => {
    groupedDnsRecords[repoName].forEach((dnsRecord) => {
      if (dnsRecord.addCAARecord) {
        html += `<p style="${bodyFooterStyle}">Please add CAA records for the following repo: <b>${repoName}</b>.`

        html += ` <table style="${tableStyle}">
        <thead>
          <tr style="${headerRowStyle}">
            <th style="${thStyle}">Repo Name</th>
            <th style="${thStyle}">Type</th>
            <th style="${thStyle}">Flags</th>
            <th style="${thStyle}">Tag</th>
            <th style="${thStyle}">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr style="${tdStyle}">
            <td style="${tdStyle}  background-color: #f2f2f2" rowspan="2" >${repoName}</td>
            <td style="${tdStyle}">${dnsRecord.primaryDomainSource}</td>
            <td style="${tdStyle}">0</td>
            <td style="${tdStyle}">issue</td>
            <td style="${tdStyle}">amazontrust.com</td>
          </tr>
          <tr style="${tdStyle}">
            <td style="${tdStyle}">${dnsRecord.primaryDomainSource}</td>
            <td style="${tdStyle}">0</td>
            <td style="${tdStyle}">issuewild</td>
            <td style="${tdStyle}">amazontrust.com</td>
          </tr>
        </tbody>
  </table>`
      }
    })
  })

  Object.keys(groupedDnsRecords).forEach((repoName) => {
    const allQuadARecordsForRepo: DigDNSRecord[] = []
    groupedDnsRecords[repoName].forEach((dnsRecord) => {
      if (dnsRecord.quadARecords) {
        allQuadARecordsForRepo.push(...dnsRecord.quadARecords)
      }
    })

    if (allQuadARecordsForRepo.length > 0) {
      html += `<p style="${bodyFooterStyle}">Note that there are some AAAA records found for the following repo: <b>${repoName}</b>. Please
        make sure to drop these records.</p>
        <table style="${tableStyle}">
        <thead>
          <tr style="${headerRowStyle}">
            <th style="${thStyle}">Domain</th>
            <th style="${thStyle}">Class</th>
            <th style="${thStyle}">Type</th>
            <th style="${thStyle}">Value</th>
          </tr>
        </thead>
        <tbody>`

      allQuadARecordsForRepo.forEach((record) => {
        html += `
                <tr style="${tdStyle}">
                  <td style="${tdStyle}" >${record.domain}</td>
                  <td style="${tdStyle}">${record.class}</td>
                  <td style="${tdStyle}">${record.type}</td>
                  <td style="${tdStyle}">${record.value}</td>
                </tr>`
      })

      html += `
        </tbody>
      </table>`
    }
  })

  html += `<p style="${bodyFooterStyle}">This email was sent from the Isomer CMS backend.</p>`
  return html
}

export function getErrorEmailBody(
  submissionId: string,
  failureResults: LaunchFailureEmailProps[]
) {
  let html = `<p style="${bodyTitleStyle}">The following sites were NOT launched successfully. (Form submission id [${submissionId}])</p>
        <table style="${tableStyle}">
          <thead>
            <tr style="${headerRowStyle}">
              <th style="${thStyle}">Repo Name</th>
              <th style="${thStyle}">Error</th>
            </tr>
          </thead>
          <tbody>`
  failureResults.forEach((failureResult) => {
    const displayedRepoName = failureResult.repoName || "<missing repo name>"
    html += `
            <tr style="${tdStyle}">
              <td style="${repoNameStyle}">${displayedRepoName}</td>
              <td style="${tdStyle}">${failureResult.error}</td>
            </tr>`
  })
  html += `
          </tbody>
        </table>
        <p style="${bodyFooterStyle}">This email was sent from the Isomer CMS backend.</p>`
  return html
}
