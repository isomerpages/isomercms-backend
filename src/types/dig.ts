export type DigResponse = {
  question: string[][]
  answer?: {
    domain: string
    ttl: string
    class: string
    type: DigType
    value: string
  }[]
  time?: number
  server?: string
  datetime?: string
  size?: number
}

export type DigType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "NS"
  | "PTR"
  | "SOA"
  | "SRV"
  | "TXT"
