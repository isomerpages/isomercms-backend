import { err, ok } from "neverthrow"

import { CONTACT_US_FILENAME, HOMEPAGE_FILENAME } from "@root/constants"
import { BaseIsomerError } from "@root/errors/BaseError"
import EmptyStringError from "@root/errors/EmptyStringError"
import MissingResourceRoomError from "@root/errors/MissingResourceRoomError"
import { NotFoundError } from "@root/errors/NotFoundError"
import { MOCK_STAGING_URL_GITHUB } from "@root/fixtures/repoInfo"
import { MOCK_USER_SESSION_DATA_ONE } from "@root/fixtures/sessionData"
import {
  CollectionPageName,
  ContactUsPageName,
  HomepageName,
  ResourceCategoryPageName,
  SubcollectionPageName,
  UnlinkedPageName,
} from "@root/types/pages"
import { Brand } from "@root/types/util"
import { extractPathInfo } from "@root/utils/files"
import { ResourceRoomDirectoryService } from "@services/directoryServices/ResourceRoomDirectoryService"

import { CollectionPageService } from "../CollectionPageService"
import { ContactUsPageService } from "../ContactUsPageService"
import { HomepagePageService } from "../HomepagePageService"
import { PageService } from "../PageService"
import { ResourcePageService } from "../ResourcePageService"
import { SubcollectionPageService } from "../SubcollectionPageService"
import { UnlinkedPageService } from "../UnlinkedPageService"

const mockContactUsService = jest.mocked<ContactUsPageService>(({
  read: jest.fn(),
} as unknown) as ContactUsPageService)
const mockCollectionPageService = jest.mocked<CollectionPageService>(({
  read: jest.fn(),
} as unknown) as CollectionPageService)
const mockSubcollectionPageService = jest.mocked<SubcollectionPageService>(({
  read: jest.fn(),
} as unknown) as SubcollectionPageService)
const mockHomepageService = jest.mocked<HomepagePageService>(({
  read: jest.fn(),
} as unknown) as HomepagePageService)
const mockResourcePageService = jest.mocked<ResourcePageService>(({
  read: jest.fn(),
} as unknown) as ResourcePageService)
const mockUnlinkedPageService = jest.mocked<UnlinkedPageService>(({
  read: jest.fn(),
} as unknown) as UnlinkedPageService)
const mockResourceRoomDirectoryService = jest.mocked<ResourceRoomDirectoryService>(
  ({
    getResourceRoomDirectoryName: jest.fn(),
  } as unknown) as ResourceRoomDirectoryService
)
const pageService = new PageService({
  contactUsService: mockContactUsService,
  collectionPageService: mockCollectionPageService,
  subCollectionPageService: mockSubcollectionPageService,
  homepageService: mockHomepageService,
  resourcePageService: mockResourcePageService,
  unlinkedPageService: mockUnlinkedPageService,
  resourceRoomDirectoryService: mockResourceRoomDirectoryService,
})

const MOCK_RESOURCE_ROOM_NAME = "resources"
const MOCK_UNLINKED_PAGE_NAME = "some_page"
const MOCK_COLLECTION_NAME = "a_collection"
const MOCK_SUBCOLLECTION_NAME = "submarine"
const MOCK_RESOURCE_CATEGORY_NAME = "meow"
const createMockStagingPermalink = (mockPageName: string) =>
  `${MOCK_STAGING_URL_GITHUB}/${mockPageName}`
const createMockFrontMatter = (mockPageName: string) => ({
  fileName: MOCK_UNLINKED_PAGE_NAME,
  content: {
    frontMatter: {
      permalink: `/${mockPageName}`,
    },
    pageBody: "",
  },
  sha: "",
})

describe("PageService", () => {
  describe("parsePageName", () => {
    it("should only accept 'index.md' as the homepage name", async () => {
      // Arrange
      const expected = ok({
        name: HOMEPAGE_FILENAME,
        kind: "Homepage",
      })

      // Act
      const actual = await pageService.parsePageName(
        { name: "index.md", path: err([]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should accept 'pages/contact-us.md' as the contact-us page name", async () => {
      // Arrange
      const expected = ok({
        name: CONTACT_US_FILENAME,
        kind: "ContactUsPage",
      })

      // Act
      const actual = await pageService.parsePageName(
        { name: CONTACT_US_FILENAME, path: ok(["pages"]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it('should parse "contact-us.md" into an error', async () => {
      // Arrange
      const expected = err(
        new NotFoundError(
          "Error when parsing path: , please ensure that the file exists!"
        )
      )
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )

      // Act
      const actual = await pageService.parsePageName(
        { name: CONTACT_US_FILENAME, path: ok([]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it('should parse "pages/<page_name>" into an unlinked page name', async () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        kind: "UnlinkedPage",
      })

      // Act
      const actual = await pageService.parsePageName(
        {
          name: `${MOCK_UNLINKED_PAGE_NAME}`,
          path: ok(["pages"]),
          __kind: "PathInfo",
        },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should parse filepaths like `<resource_room_name>/<resource_category_name>/_posts/<page_name>` into a resource category page name if the layout is `post`", async () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        resourceRoom: MOCK_RESOURCE_ROOM_NAME,
        resourceCategory: MOCK_RESOURCE_CATEGORY_NAME,
        kind: "ResourceCategoryPage",
      })
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )
      mockResourcePageService.read.mockResolvedValueOnce({
        content: {
          frontMatter: {
            layout: "post",
          },
          pageBody: "",
        },
        fileName: MOCK_UNLINKED_PAGE_NAME,
        sha: "sha",
      })

      // Act
      const actual = await pageService.parsePageName(
        {
          name: `${MOCK_UNLINKED_PAGE_NAME}`,
          path: ok([
            MOCK_RESOURCE_ROOM_NAME,
            MOCK_RESOURCE_CATEGORY_NAME,
            "_posts",
          ]),
          __kind: "PathInfo",
        },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should return `NotFoundError` if the `layout` of the resource item is not `post`", async () => {
      // Arrange
      const expected = err(new NotFoundError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )
      mockResourcePageService.read.mockResolvedValueOnce({
        content: {
          frontMatter: {
            layout: "file",
          },
          pageBody: "",
        },
        fileName: MOCK_UNLINKED_PAGE_NAME,
        sha: "sha",
      })

      // Act
      const actual = await pageService.parsePageName(
        {
          name: MOCK_UNLINKED_PAGE_NAME,
          path: ok([
            MOCK_RESOURCE_ROOM_NAME,
            MOCK_RESOURCE_CATEGORY_NAME,
            "_posts",
          ]),
          __kind: "PathInfo",
        },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should parse 2 level filepaths without 'index.md' into a collection name if there is no resource room name", async () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        collection: MOCK_COLLECTION_NAME,
        kind: "CollectionPage",
      })
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockRejectedValueOnce(
        null
      )

      // Act
      const actual = await pageService.parsePageName(
        {
          name: MOCK_UNLINKED_PAGE_NAME,
          path: ok([MOCK_COLLECTION_NAME]),
          __kind: "PathInfo",
        },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should parse 3 level filepaths without 'index.md' into a sub-collection name if there is no resource room name", async () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        collection: MOCK_COLLECTION_NAME,
        subcollection: MOCK_SUBCOLLECTION_NAME,
        kind: "SubcollectionPage",
      })
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockRejectedValueOnce(
        null
      )

      // Act
      const actual = await pageService.parsePageName(
        {
          name: MOCK_UNLINKED_PAGE_NAME,
          path: ok([MOCK_COLLECTION_NAME, MOCK_SUBCOLLECTION_NAME]),
          __kind: "PathInfo",
        },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should parse two level filepaths including 'index.md' to `NotFoundError`", async () => {
      // Arrange
      const expected = err(new NotFoundError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )

      // Act
      const actual = await pageService.parsePageName(
        // NOTE: Extra front slash
        { name: `/${HOMEPAGE_FILENAME}`, path: err([]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should parse `/` into `NotFoundError`", async () => {
      // Arrange
      const expected = err(new NotFoundError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )

      // Act
      const actual = await pageService.parsePageName(
        { name: "/", path: err([]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })

    it("should parse single level filepaths that are not 'index.md' into `NotFoundError`", async () => {
      // Arrange
      const expected = err(new NotFoundError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )

      // Act
      const actual = await pageService.parsePageName(
        { name: "gibberish", path: err([]), __kind: "PathInfo" },
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toBeCalled()
    })
  })

  describe("extractResourceRoomName", () => {
    it("should call the underlying service and return a result if the promise resolves", async () => {
      // Arrange
      const expected = ok({
        name: MOCK_RESOURCE_ROOM_NAME,
        kind: "ResourceRoomName",
      })
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: MOCK_RESOURCE_ROOM_NAME }
      )

      // Act
      const actual = await pageService.extractResourceRoomName(
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        mockResourceRoomDirectoryService.getResourceRoomDirectoryName
      ).toBeCalledWith(MOCK_USER_SESSION_DATA_ONE)
    })

    it("should call the underlying service and return a `MissingResourceRoomError` if the promise resolves to `null`", async () => {
      // Arrange
      const expected = err(new MissingResourceRoomError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName: null }
      )

      // Act
      const actual = await pageService.extractResourceRoomName(
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        mockResourceRoomDirectoryService.getResourceRoomDirectoryName
      ).toBeCalledWith(MOCK_USER_SESSION_DATA_ONE)
    })

    it("should call the underlying service and return a `MissingResourceRoomError` if the promise rejects", async () => {
      // Arrange
      const expected = err(new MissingResourceRoomError())
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockRejectedValueOnce(
        null
      )

      // Act
      const actual = await pageService.extractResourceRoomName(
        MOCK_USER_SESSION_DATA_ONE
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        mockResourceRoomDirectoryService.getResourceRoomDirectoryName
      ).toBeCalledWith(MOCK_USER_SESSION_DATA_ONE)
    })
  })

  describe("extractPathInfo", () => {
    it("should return a `PathInfo` with a valid path when the string provided is a valid filepath", () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        path: ok([MOCK_RESOURCE_ROOM_NAME, MOCK_RESOURCE_CATEGORY_NAME]),
        __kind: "PathInfo",
      })

      // Act
      const actual = extractPathInfo(
        `${MOCK_RESOURCE_ROOM_NAME}/${MOCK_RESOURCE_CATEGORY_NAME}/${MOCK_UNLINKED_PAGE_NAME}`
      )

      // Assert
      expect(actual).toStrictEqual(expected)
    })

    it("should return a `PathInfo` with an `err` path when the string provided does not contain `/`", () => {
      // Arrange
      const expected = ok({
        name: MOCK_UNLINKED_PAGE_NAME,
        path: err([]),
        __kind: "PathInfo",
      })

      // Act
      const actual = extractPathInfo(`${MOCK_UNLINKED_PAGE_NAME}`)

      // Assert
      expect(actual).toStrictEqual(expected)
    })

    it("should return a `PathInfo` with an empty string as the name when the `/` terminates the string", () => {
      // Arrange
      const expected = ok({
        name: "",
        path: ok([MOCK_RESOURCE_ROOM_NAME]),
        __kind: "PathInfo",
      })

      // Act
      const actual = extractPathInfo(`${MOCK_RESOURCE_ROOM_NAME}/`)

      // Assert
      expect(actual).toStrictEqual(expected)
    })

    it("should return a `EmptyStringError` when an empty string is provided as input", () => {
      // Arrange
      const expected = err(new EmptyStringError())

      // Act
      const actual = extractPathInfo("")

      // Assert
      expect(actual).toEqual(expected)
    })
  })
  describe("retrieveStagingPermalink", () => {
    it("should call the underlying service and return the `permalink` of the unlinked page when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: UnlinkedPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "UnlinkedPage",
      }
      mockUnlinkedPageService.read.mockResolvedValueOnce(
        createMockFrontMatter(MOCK_UNLINKED_PAGE_NAME)
      )
      const expected = ok(createMockStagingPermalink(MOCK_UNLINKED_PAGE_NAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockUnlinkedPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the unlinked page could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: UnlinkedPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "UnlinkedPage",
      }
      mockUnlinkedPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockUnlinkedPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the unlinked page has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: UnlinkedPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "UnlinkedPage",
      }
      mockUnlinkedPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockUnlinkedPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
        }
      )
    })
    it("should call the underlying service and return the `permalink` of the contact us page when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ContactUsPageName = {
        name: Brand.fromString(CONTACT_US_FILENAME),
        kind: "ContactUsPage",
      }
      mockContactUsService.read.mockResolvedValueOnce(
        createMockFrontMatter(CONTACT_US_FILENAME)
      )
      const expected = ok(createMockStagingPermalink(CONTACT_US_FILENAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockContactUsService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the contact us page could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ContactUsPageName = {
        name: Brand.fromString(CONTACT_US_FILENAME),
        kind: "ContactUsPage",
      }
      mockContactUsService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockContactUsService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the contact-us page has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ContactUsPageName = {
        name: Brand.fromString(CONTACT_US_FILENAME),
        kind: "ContactUsPage",
      }
      mockContactUsService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockContactUsService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return the `permalink` of the homepage when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: HomepageName = {
        name: Brand.fromString(HOMEPAGE_FILENAME),
        kind: "Homepage",
      }
      mockHomepageService.read.mockResolvedValueOnce(
        createMockFrontMatter(HOMEPAGE_FILENAME)
      )
      const expected = ok(createMockStagingPermalink(HOMEPAGE_FILENAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockHomepageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the homepage could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: HomepageName = {
        name: Brand.fromString(HOMEPAGE_FILENAME),
        kind: "Homepage",
      }
      mockHomepageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockHomepageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the homepage has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: HomepageName = {
        name: Brand.fromString(HOMEPAGE_FILENAME),
        kind: "Homepage",
      }
      mockHomepageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockHomepageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE
      )
    })

    it("should call the underlying service and return the `permalink` of the resource category page when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ResourceCategoryPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "ResourceCategoryPage",
        resourceCategory: MOCK_RESOURCE_CATEGORY_NAME,
        resourceRoom: Brand.fromString(MOCK_RESOURCE_ROOM_NAME),
      }
      mockResourcePageService.read.mockResolvedValueOnce(
        createMockFrontMatter(MOCK_UNLINKED_PAGE_NAME)
      )
      const expected = ok(createMockStagingPermalink(MOCK_UNLINKED_PAGE_NAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          resourceCategoryName: MOCK_PAGE_NAME.resourceCategory,
          resourceRoomName: MOCK_PAGE_NAME.resourceRoom,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the resource category page could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ResourceCategoryPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "ResourceCategoryPage",
        resourceCategory: MOCK_RESOURCE_CATEGORY_NAME,
        resourceRoom: Brand.fromString(MOCK_RESOURCE_ROOM_NAME),
      }
      mockResourcePageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          resourceCategoryName: MOCK_PAGE_NAME.resourceCategory,
          resourceRoomName: MOCK_PAGE_NAME.resourceRoom,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the resource category page has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: ResourceCategoryPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "ResourceCategoryPage",
        resourceCategory: MOCK_RESOURCE_CATEGORY_NAME,
        resourceRoom: Brand.fromString(MOCK_RESOURCE_ROOM_NAME),
      }
      mockResourcePageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockResourcePageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          resourceCategoryName: MOCK_PAGE_NAME.resourceCategory,
          resourceRoomName: MOCK_PAGE_NAME.resourceRoom,
        }
      )
    })

    it("should call the underlying service and return the `permalink` of the subcollection page when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: SubcollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "SubcollectionPage",
        collection: MOCK_COLLECTION_NAME,
        subcollection: Brand.fromString(MOCK_SUBCOLLECTION_NAME),
      }
      mockSubcollectionPageService.read.mockResolvedValueOnce(
        createMockFrontMatter(MOCK_UNLINKED_PAGE_NAME)
      )
      const expected = ok(createMockStagingPermalink(MOCK_UNLINKED_PAGE_NAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
          subcollectionName: MOCK_PAGE_NAME.subcollection,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the subcollection page could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: SubcollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "SubcollectionPage",
        collection: MOCK_COLLECTION_NAME,
        subcollection: Brand.fromString(MOCK_SUBCOLLECTION_NAME),
      }
      mockSubcollectionPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
          subcollectionName: MOCK_PAGE_NAME.subcollection,
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the subcollection page has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: SubcollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "SubcollectionPage",
        collection: MOCK_COLLECTION_NAME,
        subcollection: Brand.fromString(MOCK_SUBCOLLECTION_NAME),
      }
      mockSubcollectionPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
          subcollectionName: MOCK_PAGE_NAME.subcollection,
        }
      )
    })

    it("should call the underlying service and return the `permalink` of the collection page when successful", async () => {
      // Arrange
      const MOCK_PAGE_NAME: CollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "CollectionPage",
        collection: MOCK_COLLECTION_NAME,
      }
      mockCollectionPageService.read.mockResolvedValueOnce(
        createMockFrontMatter(MOCK_UNLINKED_PAGE_NAME)
      )
      const expected = ok(createMockStagingPermalink(MOCK_UNLINKED_PAGE_NAME))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the collection page could not be fetched", async () => {
      // Arrange
      const MOCK_PAGE_NAME: CollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "CollectionPage",
        collection: MOCK_COLLECTION_NAME,
      }
      mockCollectionPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
        }
      )
    })

    it("should call the underlying service and return a `BaseIsomerError` when the frontmatter of the collection page has no `permalink`", async () => {
      // Arrange
      const MOCK_PAGE_NAME: CollectionPageName = {
        name: Brand.fromString(MOCK_UNLINKED_PAGE_NAME),
        kind: "CollectionPage",
        collection: MOCK_COLLECTION_NAME,
      }
      mockCollectionPageService.read.mockRejectedValueOnce({})
      const expected = err(new BaseIsomerError({}))

      // Act
      const actual = await pageService.retrieveStagingPermalink(
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_STAGING_URL_GITHUB,
        MOCK_PAGE_NAME
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(
        MOCK_USER_SESSION_DATA_ONE,
        {
          fileName: MOCK_PAGE_NAME.name,
          collectionName: MOCK_PAGE_NAME.collection.slice(1),
        }
      )
    })
  })
})
