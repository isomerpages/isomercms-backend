import { createLogger, format } from "winston"
import WinstonCloudWatch from "winston-cloudwatch"

export const logger = createLogger({
  level: "debug",
  format: format.json(),
  transports: [
    new WinstonCloudWatch({
      level: "error",
      logGroupName: "groupName",
      logStreamName: "errors",
      awsRegion: "eu-west-3",
    }),
  ],
})

export default logger
