/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@root/(.*)": "<rootDir>/$1",
    "^@classes/(.*)": "<rootDir>/classes/$1",
    "^@errors/(.*)": "<rootDir>/errors/$1",
    "^@logger/(.*)": "<rootDir>/logger/$1",
    "^@middleware/(.*)": "<rootDir>/middleware/$1",
    "^@routes/(.*)": "<rootDir>/routes/$1",
    "^@utils/(.*)": "<rootDir>/utils/$1",
    "^@loaders/(.*)": "<rootDir>/loaders/$1",
    "^@database/(.*)": "<rootDir>/database/$1",
    "^@services/(.*)": "<rootDir>/services/$1",
    "^@validators/(.*)": "<rootDir>/validators/$1",
    "^@fixtures/(.*)": "<rootDir>/fixtures/$1",
    "^@mocks/(.*)": "<rootDir>/__mocks__/$1",
  },
}
