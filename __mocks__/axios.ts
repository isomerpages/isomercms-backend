import mockAxios from "jest-mock-axios"

mockAxios.interceptors.request.use(jest.fn())
mockAxios.interceptors.response.use(jest.fn())

export default mockAxios
