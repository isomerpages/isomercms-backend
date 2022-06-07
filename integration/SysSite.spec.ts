import express from "express"
import { Op } from "sequelize"
import request from "supertest"

import { Site } from "@database/models"
import { generateRouter } from "@fixtures/app"
import { SiteRouter } from "@root/newroutes/authenticatedSystem/site"
import { sitesService } from "@services/identity"
import { CreateSiteProps } from "@services/identity/SitesService"

// const mockValidEmail = "open@up.gov.sg"
const siteRouter = new SiteRouter({ sitesService })
const siteSubrouter = siteRouter.getRouter()

// Set up express with defaults and use the router under test
const subrouter = express()
subrouter.use(siteSubrouter)
const app = generateRouter(subrouter)

const mockRepositoryName = "trillian-repo"
const mockRepositoryName2 = "arthur-repo"
const mockRepositoryName3 = "heart-of-gold-repo"
const mockContact = "slartibartfast@not.important.name"
const mockUrl = "https://zaphod.com"
const mockUrl2 = "https://bebblebrox.com"
const mockAgency = "The Vogsphere"
const mockSiteName = "Oh freddled gruntbuggly"
const mockId = "marvin"
const mockDateString = "2022-06-04T14:22:12.910Z"
const mockDateString2 = "2022-06-04T10:00:00.000Z"

const mockSiteCreateMin: CreateSiteProps = {
  repositoryName: mockRepositoryName,
}

const mockSiteCreateFull: CreateSiteProps = {
  repositoryName: mockRepositoryName,
  contact: mockContact,
  repositoryUrl: mockUrl,
  createdBy: mockContact,
  agency: mockAgency,
  siteName: mockSiteName,
  hostingId: mockId,
  stagingUrl: mockUrl,
  productionUrl: mockUrl,
  liveDomain: mockUrl,
  redirectFrom: [mockUrl, mockUrl2],
  uptimeId: mockId,
  uptimeUrl: mockUrl,
  launchedAt: mockDateString,
  launchedBy: mockContact,
}

describe("System Site Router", () => {
  describe("POST /site", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock site don't interfere with each other
      await Site.destroy({
        where: { repositoryName: mockRepositoryName },
      })
    })

    it("should return 200 when posting minimal data", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app).post("/").send(mockSiteCreateMin)

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(actual.body).toMatchObject(mockSiteCreateMin)
    })

    it("should return 200 when posting full data", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app).post("/").send(mockSiteCreateFull)

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(actual.body).toMatchObject(mockSiteCreateFull)
    })

    it("should return when 400 repository name already exists", async () => {
      // Arrange
      const expected = 400
      await Site.create(mockSiteCreateMin as never)

      // Act
      const actual = await request(app).post("/").send(mockSiteCreateMin)

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when repositoryName is missing from input", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/").send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when createdBy is not an email address", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ createdBy: "Arthur", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when launchedBy is not an email address", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ launchedBy: "Arthur", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when repositoryUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ repositoryUrl: "Hitchhiker's Guide", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when stagingUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ stagingUrl: "Hitchhiker's Guide", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when productionUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ productionUrl: "Hitchhiker's Guide", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when uptimeUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ uptimeUrl: "Hitchhiker's Guide", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when launchedAt is not an ISO Date String", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ launchedAt: "The end of the universe", ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when redirectFrom is not an array of strings", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .post("/")
        .send({ redirectFrom: [42], ...mockSiteCreateMin })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })

  describe("GET /site/:siteName", () => {
    beforeAll(async () => {
      await await Site.create(mockSiteCreateFull as never)
    })

    afterAll(async () => {
      // Clean up so that different tests using
      // the same mock site don't interfere with each other
      await Site.destroy({
        where: { repositoryName: mockRepositoryName },
      })
    })

    it("should return 200 when the site is found", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app).get(`/${mockRepositoryName}`).send()

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(actual.body).toMatchObject(mockSiteCreateFull)
    })

    it("should return 404 when the site is not found", async () => {
      // Arrange
      const expected = 404

      // Act
      const actual = await request(app).get(`/not-${mockRepositoryName}`).send()

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })

  describe("PATCH /site/:siteName", () => {
    beforeEach(async () => {
      await Site.create(mockSiteCreateFull as never)
      await Site.create({
        ...mockSiteCreateFull,
        repositoryName: mockRepositoryName2,
      })
    })

    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock site don't interfere with each other
      await Site.destroy({
        where: {
          [Op.or]: [
            { repositoryName: mockRepositoryName },
            { repositoryName: mockRepositoryName2 },
            { repositoryName: mockRepositoryName3 },
          ],
        },
      })
    })

    it("should return 200 when updating fields to different non-null values", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({
          repositoryName: mockRepositoryName3,
          contact: `not-${mockContact}`,
          repositoryUrl: mockUrl2,
          createdBy: `not-${mockContact}`,
          agency: `not-${mockAgency}`,
          siteName: `not-${mockSiteName}`,
          hostingId: `not-${mockId}`,
          stagingUrl: mockUrl2,
          productionUrl: mockUrl2,
          liveDomain: mockUrl2,
          redirectFrom: [mockUrl],
          uptimeId: `not-${mockId}`,
          uptimeUrl: mockUrl2,
          launchedAt: mockDateString2,
          launchedBy: `not-${mockContact}`,
        })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 200 when updating nullable fields to null", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app).patch(`/${mockRepositoryName}`).send({
        contact: null,
        repositoryUrl: null,
        createdBy: null,
        agency: null,
        siteName: null,
        hostingId: null,
        stagingUrl: null,
        productionUrl: null,
        liveDomain: null,
        redirectFrom: null,
        uptimeId: null,
        uptimeUrl: null,
        launchedAt: null,
        launchedBy: null,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 200 when updating fields to the same values", async () => {
      // Arrange
      const expected = 200

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send(mockSiteCreateFull)

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when updating no fields", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).patch(`/${mockRepositoryName}`).send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 404 when the site is not found", async () => {
      // Arrange
      const expected = 404

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName3}`)
        .send({ createdBy: `not-${mockContact}` })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    //---------------------------------------------------------

    it("should return when 400 repository name already exists", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ repositoryName: mockRepositoryName2 })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when createdBy is not an email address", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ createdBy: "Arthur" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when launchedBy is not an email address", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ launchedBy: "Arthur" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when repositoryUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ repositoryUrl: "Hitchhiker's Guide" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when stagingUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ stagingUrl: "Hitchhiker's Guide" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when productionUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ productionUrl: "Hitchhiker's Guide" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when uptimeUrl is not a URI", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ uptimeUrl: "Hitchhiker's Guide" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when launchedAt is not an ISO Date String", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ launchedAt: "The end of the universe" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when redirectFrom is not an array of strings", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app)
        .patch(`/${mockRepositoryName}`)
        .send({ redirectFrom: [42] })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })
})
