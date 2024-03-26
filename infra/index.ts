import "module-alias/register"

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

app.get("/v2/infra/formsg/a", (req, res) => {
  res.status(200).send("Hello World!")
})

app.listen(8081, () => {
  console.log("Infra container is running on port 8081")
})
