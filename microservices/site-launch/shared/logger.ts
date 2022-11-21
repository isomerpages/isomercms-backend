import { CloudWatchLogsClientConfig } from "@aws-sdk/client-cloudwatch-logs"

import { CloudWatchLogs } from "aws-sdk"
import winston from "winston"
import TransportStream from "winston-transport"

// taken from https://github.com/lazywithclass/winston-cloudwatch/blob/master/typescript/winston-cloudwatch.d.ts
// Declare optional exports
type LogObject = winston.LogEntry

interface CloudwatchTransportOptions {
  name?: string
  cloudWatchLogs?: CloudWatchLogs
  level?: string
  ensureLogGroup?: boolean
  logGroupName?: string | (() => string)
  logStreamName?: string | (() => string)
  awsAccessKeyId?: string
  awsSecretKey?: string
  awsRegion?: string
  awsOptions?: CloudWatchLogsClientConfig
  jsonMessage?: boolean
  messageFormatter?: (logObject: LogObject) => string
  uploadRate?: number
  errorHandler?: (err: Error) => void
  silent?: boolean
  retentionInDays?: number
}

// Declare the default WinstonCloudwatch class
declare class WinstonCloudwatch extends TransportStream {
  constructor(options?: CloudwatchTransportOptions)
}

const logger = winston.add(
  new WinstonCloudwatch({
    name: "site-launch",
    logGroupName: "site-launch-log-group",
    logStreamName: "site-launch",
    awsRegion: "ap-southeast-1",
    level: "info",
  })
)

export default logger
