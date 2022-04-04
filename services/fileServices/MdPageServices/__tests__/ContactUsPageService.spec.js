const {
  contactUsContent: mockContactUsContent,
  contactUsSha: mockContactUsSha,
  rawContactUsContent: mockRawContactUsContent,
} = require("@fixtures/contactUs")
const {
  footerContent: mockFooterContent,
  footerSha: mockFooterSha,
} = require("@fixtures/footer")
const { NotFoundError } = require("@root/errors/NotFoundError")

describe("ContactUs Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const reqDetails = { siteName, accessToken }

  const CONTACT_US_FILE_NAME = "contact-us.md"
  const CONTACT_US_DIRECTORY_NAME = "pages"

  const mockFrontMatter = {
    ...mockContactUsContent.frontMatter,
    feedback: mockFooterContent.feedback,
  }
  const mockContent = mockContactUsContent.pageBody

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const mockFooterYmlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  jest.mock("@utils/markdown-utils", () => ({
    retrieveDataFromMarkdown: jest.fn().mockReturnValue({
      frontMatter: mockFrontMatter,
      pageContent: mockContent,
    }),
    convertDataToMarkdown: jest.fn().mockReturnValue(mockRawContactUsContent),
  }))

  const {
    ContactUsPageService,
  } = require("@services/fileServices/MdPageServices/ContactUsPageService")
  const service = new ContactUsPageService({
    gitHubService: mockGithubService,
    footerYmlService: mockFooterYmlService,
  })

  const {
    retrieveDataFromMarkdown,
    convertDataToMarkdown,
  } = require("@utils/markdown-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })
  mockFooterYmlService.read.mockResolvedValue({
    content: mockFooterContent,
    sha: mockFooterSha,
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValue({
      content: mockRawContactUsContent,
      sha: mockContactUsSha,
    })

    it("Reading the contact us page works correctly", async () => {
      await expect(service.read(reqDetails)).resolves.toMatchObject({
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha: mockContactUsSha,
      })

      expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
        mockRawContactUsContent
      )
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: CONTACT_US_FILE_NAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
      })
      expect(mockFooterYmlService.read).toHaveBeenCalledWith(reqDetails)
    })

    it("Propagates the correct error on failed retrieval", async () => {
      mockFooterYmlService.read.mockRejectedValueOnce(new NotFoundError(""))

      await expect(service.read(reqDetails)).rejects.toThrowError(NotFoundError)

      expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
        mockRawContactUsContent
      )
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: CONTACT_US_FILE_NAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
      })
      expect(mockFooterYmlService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    const updatedFeedback = "updated"
    mockGithubService.update.mockResolvedValue({ newSha: mockContactUsSha })
    it("Updating page content works correctly", async () => {
      const mockUpdatedFrontMatter = {
        ...mockContactUsContent.frontMatter,
        feedback: updatedFeedback,
      }
      const updateReq = {
        fileName: CONTACT_US_FILE_NAME,
        content: mockContent,
        frontMatter: mockUpdatedFrontMatter,
        sha: oldSha,
      }
      const expectedResp = {
        content: { frontMatter: mockUpdatedFrontMatter, pageBody: mockContent },
        oldSha,
        newSha: mockContactUsSha,
      }

      await expect(
        service.update(reqDetails, updateReq)
      ).resolves.toMatchObject(expectedResp)

      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        mockUpdatedFrontMatter,
        mockContent
      )
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: CONTACT_US_FILE_NAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
        fileContent: mockRawContactUsContent,
        sha: oldSha,
      })
      expect(mockFooterYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockFooterYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: {
          ...mockFooterContent,
          feedback: updatedFeedback,
        },
        sha: mockFooterSha,
      })
    })
    it("Propagates the correct error on failed update", async () => {
      mockGithubService.update.mockRejectedValueOnce(new NotFoundError(""))
      const updateReq = {
        fileName: CONTACT_US_FILE_NAME,
        content: mockContent,
        frontMatter: mockFrontMatter,
        sha: oldSha,
      }

      await expect(service.update(reqDetails, updateReq)).rejects.toThrowError(
        NotFoundError
      )

      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        mockFrontMatter,
        mockContent
      )
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: CONTACT_US_FILE_NAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
        fileContent: mockRawContactUsContent,
        sha: oldSha,
      })
    })
  })
})
