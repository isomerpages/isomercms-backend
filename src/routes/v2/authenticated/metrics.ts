import express from "express"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ISOMER_ADMIN_EMAIL } from "@root/constants"
import { mailer } from "@root/services/utilServices/MailClient"
import { RequestHandler } from "@root/types"
import { FeedbackDto } from "@root/types/dto/feedback"
import { CollateUserFeedbackRequestSchema } from "@root/validators/RequestSchema"
import { statsService } from "@services/infra/StatsService"

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

// eslint-disable-next-line import/prefer-default-export
export class MetricsRouter {
  collateUserFeedback: RequestHandler<
    never,
    unknown,
    FeedbackDto,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = (req, res) => {
    const { userType } = req.body
    const { error } = CollateUserFeedbackRequestSchema.validate(req.body)
    if (error)
      return res.status(400).json({
        message: `Invalid request format: ${error.message}`,
      })
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
