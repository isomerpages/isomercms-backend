import express from "express"

import { infraService } from "@common/index"
import { useSharedMiddleware } from "@common/middleware"

import { v2Router } from "./routes"

const app = express()

// poller site launch updates
infraService.pollMessages()

useSharedMiddleware(app)

// TODO: prefix under infra
// FormSG Backend handler routes
app.use("/", v2Router)

app.listen(8082, () => {
  console.log("Server is running on port 8082")
})
