import { createLogger, format } from "winston"
import WinstonCloudWatch from "winston-cloudwatch"

const logger = createLogger({
  level: "info",
  format: format.json(),
  transports: [
    new WinstonCloudWatch({
      level: "info",
      logGroupName: "SiteLaunch",
      logStreamName: "errors",
      awsRegion: "ap-southeast-1",
      name: "SiteLaunch_Microservice",
    }),
  ],
})

export default logger
