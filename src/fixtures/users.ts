import { Attributes } from "sequelize/types"

import { User } from "@database/models"

export const MOCK_USER_ID_ONE = 1
export const MOCK_USER_ID_TWO = 2
export const MOCK_USER_ID_THREE = 3
export const MOCK_USER_ID_FOUR = 4

export const MOCK_USER_EMAIL_ONE = "one@test.gov.sg"
export const MOCK_USER_EMAIL_TWO = "two@test.gov.sg"
export const MOCK_USER_EMAIL_THREE = "three@test.gov.sg"
export const MOCK_USER_EMAIL_FOUR = "four@test.gov.sg"

export const MOCK_USER_DATE_ONE = new Date("2022-08-23T00:00:00Z")
export const MOCK_USER_DATE_TWO = new Date("2022-08-25T00:00:00Z")
export const MOCK_USER_DATE_THREE = new Date("2022-08-27T00:00:00Z")
export const MOCK_USER_DATE_FOUR = new Date("2022-08-29T00:00:00Z")

export const MOCK_USER_LAST_LOGIN_ONE = new Date("2022-09-12T00:00:00Z")
export const MOCK_USER_LAST_LOGIN_TWO = new Date("2022-09-14T00:00:00Z")
export const MOCK_USER_LAST_LOGIN_THREE = new Date("2022-09-16T00:00:00Z")
export const MOCK_USER_LAST_LOGIN_FOUR = new Date("2022-09-18T00:00:00Z")

export const MOCK_USER_DBENTRY_ONE: Attributes<User> = {
  id: MOCK_USER_ID_ONE,
  email: MOCK_USER_EMAIL_ONE,
  lastLoggedIn: MOCK_USER_LAST_LOGIN_ONE,
  createdAt: MOCK_USER_DATE_ONE,
  updatedAt: MOCK_USER_DATE_ONE,
}

export const MOCK_USER_DBENTRY_TWO: Attributes<User> = {
  id: MOCK_USER_ID_TWO,
  email: MOCK_USER_EMAIL_TWO,
  lastLoggedIn: MOCK_USER_LAST_LOGIN_TWO,
  createdAt: MOCK_USER_DATE_TWO,
  updatedAt: MOCK_USER_DATE_TWO,
}

export const MOCK_USER_DBENTRY_THREE: Attributes<User> = {
  id: MOCK_USER_ID_THREE,
  email: MOCK_USER_EMAIL_THREE,
  lastLoggedIn: MOCK_USER_LAST_LOGIN_THREE,
  createdAt: MOCK_USER_DATE_THREE,
  updatedAt: MOCK_USER_DATE_THREE,
}

export const MOCK_USER_DBENTRY_FOUR: Attributes<User> = {
  id: MOCK_USER_ID_FOUR,
  email: MOCK_USER_EMAIL_FOUR,
  lastLoggedIn: MOCK_USER_LAST_LOGIN_FOUR,
  createdAt: MOCK_USER_DATE_FOUR,
  updatedAt: MOCK_USER_DATE_FOUR,
}
