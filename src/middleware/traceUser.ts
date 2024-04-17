import { NextFunction, Request, Response } from "express"
import { Session } from "express-session"

import tracer from "@utils/tracer"

import { SessionData } from "@root/types/express/session"

type UserSession = Session & SessionData

function isUserSession(session: Session): session is UserSession {
  return !!(
    session &&
    "id" in session &&
    "userInfo" in session &&
    typeof session.userInfo === "object" &&
    session.userInfo &&
    "isomerUserId" in session.userInfo &&
    "email" in session.userInfo
  )
}

// eslint-disable-next-line import/prefer-default-export
export const traceUserMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isUserSession(req.session)) {
    tracer.setUser({
      id: req.session.userInfo.isomerUserId,
      session_id: req.session.id,

      // Could consider adding the entire userInfo object if we are comfortable having that data in DD traces
    })
  }
  next()
}
