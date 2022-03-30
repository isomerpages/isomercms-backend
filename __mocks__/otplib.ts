// eslint-disable-next-line import/prefer-default-export
export const totp = {
  clone: jest.fn().mockReturnThis(),
  generate: jest.fn(),
  verify: jest.fn(),
}
