import { groupBy } from "lodash"

export interface QuadARecord {
  domain: string
  class: string
  type: string
  value: string
}
export interface DnsRecordsEmailProps {
  requesterEmail: string
  repoName: string
  domainValidationSource: string
  domainValidationTarget: string
  primaryDomainSource: string
  primaryDomainTarget: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
  quadARecords?: QuadARecord[]
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
      hasRedirection ? 4 : 3
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
          <td style="${tdStyle}">${dnsRecords.primaryDomainTarget}</td>
          <td style="${tdStyle}">CNAME</td>
        </tr>`

      if (hasRedirection) {
        html += `
          <tr style="${tdStyle}">
            <td style="${tdStyle}">${dnsRecords.primaryDomainSource}</td>
            <td style="${tdStyle}">${dnsRecords.redirectionDomainTarget}</td>
            <td style="${tdStyle}">A Record</td>
          </tr>
        `
      }
    })
  })

  html += `
    </tbody>
  </table>`

  Object.keys(groupedDnsRecords).forEach((repoName) => {
    const allQuadARecordsForRepo: QuadARecord[] = []
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
