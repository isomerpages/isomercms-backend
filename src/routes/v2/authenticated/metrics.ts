import express from "express"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ISOMER_ADMIN_EMAIL } from "@root/constants"
import { AuthorizationMiddleware } from "@root/middleware/authorization"
import MailClient, { mailer } from "@root/services/utilServices/MailClient"
import { RequestHandler } from "@root/types"
import { FeedbackDto } from "@root/types/dto/feedback"
import { StatsService, statsService } from "@services/infra/StatsService"

const getFeedbackHtml = ({
  rating,
  feedback,
  userType,
  email,
}: FeedbackDto) => `
    <h1>Feedback</h1>
    <p><b>UserType: </b>${userType}</p>
    <p><b>Email: </b>${email}</p>
    <p><b>Rating: </b>${rating}</p>
    <p><b>Feedback: </b>${feedback}</p>    
`

export interface MetricsRouterProps {
  statsService: StatsService

  mailClient: MailClient
  authorizationMiddleware: AuthorizationMiddleware
}

export class MetricsRouter {
  private readonly authorizationMiddleware

  constructor({ authorizationMiddleware }: MetricsRouterProps) {
    this.authorizationMiddleware = authorizationMiddleware
  }

  collateUserFeedback: RequestHandler<
    never,
    unknown,
    FeedbackDto,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = (req, res) => {
    const { userType } = req.body
    mailer.sendMail(
      ISOMER_ADMIN_EMAIL,
      "[METRICS] User feedback",
      getFeedbackHtml(req.body)
    )
    statsService.trackNpsRating(req.body.rating, { userType })
    res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/feedback", this.collateUserFeedback)
    return router
  }
}
