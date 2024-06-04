export interface DnsCheckerResponse {
  // eslint-disable-next-line camelcase
  response_type: "in_channel"
  blocks: Array<{
    type: "section"
    text: {
      type: "mrkdwn"
      text: string
    }
  }>
}
