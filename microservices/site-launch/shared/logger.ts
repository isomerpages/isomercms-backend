import winston from "winston"

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
})

export default logger
