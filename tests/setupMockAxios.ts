import axios from "axios"

const innerPostFn = jest.fn()
const innerGetFn = jest.fn()
const innerPutFn = jest.fn()

jest.mock("axios", () => ({
  create: () => ({
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
    get: innerGetFn,
    post: innerPostFn,
    put: innerPutFn,
  }),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}))

export { axios, innerGetFn, innerPostFn, innerPutFn }
