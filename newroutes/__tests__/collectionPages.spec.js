const express = require("express")
const request = require("supertest")

const collectionPagesRouter = require("../collectionPages")

const CollectionController = jest.createMockFromModule(
  "@controllers/CollectionController"
)

describe("Collection Pages Router", () => {
  const mockController = {
    CreatePage: jest.fn(),
    ReadPage: jest.fn(),
    UpdatePage: jest.fn(),
    DeletePage: jest.fn(),
  }

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use("/sites", collectionPagesRouter)

  const siteName = "test-site"
  const collectionName = "collection"
  const subcollectionName = "subcollection"

  // beforeAll(() => {
  //   jest.mock('@controllers/CollectionController', () => (mockController));
  // })

  describe("createCollectionPage", () => {
    const pageDetails = {
      newFileName: "newFile",
      pageBody: "test",
      frontMatter: {
        title: "fileTitle",
        permalink: "file/permalink",
      },
    }

    // it('rejects requests with invalid body', async () => {
    //   await request(app)
    //     .post(`/sites/${siteName}/collections/${collectionName}/pages`)
    //     .send({})
    //     .expect(401)
    // })

    it("accepts valid create requests and returns the details of the file created", async () => {
      const mockedSha = "12345"
      const expectedResponse = {
        fileName: pageDetails.newFileName,
        content: {
          frontMatter: pageDetails.frontMatter,
          pageBody: pageDetails.pageBody,
        },
        sha: mockedSha,
      }
      mockController.CreatePage.mockResolvedValue(expectedResponse)
      jest.mock("@controllers/CollectionController", () => mockController)
      // CollectionController.CreatePage.mockResolvedValue(expectedResponse)
      // CollectionController.mockImplementation(
      //   () => mockController
      // )
      const response = await request(app)
        .post(`/sites/${siteName}/collections/${collectionName}/pages`)
        .send(pageDetails)
      expect(response.body).toStrictEqual(expectedResponse)
    })
  })
})
