import http from "http"

import createDebug from "debug"
import { Express } from "express"

import config from "@config/config"

import logger from "@logger/logger"

const debug = createDebug("isomercms:server")
const PORT = config.get("port")

/**
 * Create an event listener for HTTP server "error" event.
 *
 * See this stackoverflow question for typing of Error:
 * https://stackoverflow.com/questions/48710279/http-server-error-handler-in-typescript-and-node-js
 */
const createErrorListener = (port: number | string | false) => (
  error: NodeJS.ErrnoException
) => {
  if (error.syscall !== "listen") {
    throw error
  }

  /**
   * Get port from environment and store in Express.
   */

  const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      logger.error(`${bind} requires elevated privileges`)
      process.exit(1)
    // eslint-disable-next-line no-fallthrough
    case "EADDRINUSE":
      logger.error(`${bind} is already in use`)
      process.exit(1)
    // eslint-disable-next-line no-fallthrough
    default:
      throw error
  }
}

/**
 * Create an event listener for HTTP server "listening" event.
 */
const createListener = (
  port: number | string | false,
  server: http.Server
) => () => {
  const addr = server.address()

  if (!addr) {
    debug("Not listening on any interface!")
    process.exit(1)
  }

  const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`
  debug(`Listening on ${bind}`)
  logger.info(`isomerCMS app listening on port ${port}`)
}

const bootstrapServer = (app: Express) => {
  app.set("port", PORT)

  // Create HTTP server
  const server = http.createServer(app)

  // create event listeners
  const onError = createErrorListener(PORT)
  const onListening = createListener(PORT, server)

  // Listen on provided port, on all network interfaces.
  server.listen(PORT)
  server.on("error", onError)
  server.on("listening", onListening)
}

export default bootstrapServer
