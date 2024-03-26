import path from "path"

import cookieParser from "cookie-parser"
import cors from "cors"
import type { Express } from "express"
import express from "express"
import helmet from "helmet"
import nocache from "nocache"

import { config } from "@root/config/config"
import { featureFlagMiddleware } from "@root/middleware"
import { isSecure } from "@root/utils/auth-utils"

// Env vars
const FRONTEND_URL = config.get("app.frontendUrl")

// eslint-disable-next-line import/prefer-default-export
export const useSharedMiddleware = (app: Express): void => {
  if (isSecure) {
    // Our server only receives requests from the alb reverse proxy, so we need to use the client IP provided in X-Forwarded-For
    // This is trusted because our security groups block all other access to the server
    app.set("trust proxy", true)
  }
  app.use(helmet())

  // use growthbook across routes
  app.use(featureFlagMiddleware)

  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  )
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(express.static(path.join(__dirname, "public")))
  app.use(nocache())
}
