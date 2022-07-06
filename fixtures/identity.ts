export const mockRecipient = "hello@world.com"
export const mockSubject = "mock subject"
export const mockBody = "somebody"

export const mockAccessToken = "some token"

export const mockHeaders = {
  headers: {
    Authorization: `token ${mockAccessToken}`,
    "Content-Type": "application/json",
  },
}
export const mockSiteName = "hello world"
export const mockUserId = "some user id"

export const mockBearerTokenHeaders = {
  headers: {
    Authorization: `Bearer ${process.env.POSTMAN_API_KEY}`,
  },
}
