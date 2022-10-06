import mockAxios from "jest-mock-axios"

const getMockAxiosInstance = () => {
  const mockAxiosInstance = mockAxios.create()
  mockAxiosInstance.get.mockResolvedValue({ data: [] })
  mockAxiosInstance.post.mockResolvedValue({ data: [] })
  mockAxiosInstance.put.mockResolvedValue({ data: [] })
  mockAxiosInstance.delete.mockResolvedValue({ data: [] })
  return mockAxiosInstance
}

export const mockAxiosInstance = getMockAxiosInstance()

export const prepareAxiosMock = () => {
  // NOTE: We need to mock the axios instance using es5 named exports
  // to ensure that the calls for .get() on the instance will actually
  // return a value and not fail.
  jest.mock("../services/api/AxiosInstance.ts", () => ({
    __esModule: true, // this property makes it work
    mockAxiosInstance,
  }))
}

export default mockAxios
