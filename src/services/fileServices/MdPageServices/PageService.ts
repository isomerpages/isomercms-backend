import { ok, err, Result, ResultAsync, okAsync, errAsync } from "neverthrow"

import UserSessionData from "@root/classes/UserSessionData"
import { CONTACT_US_FILENAME, HOMEPAGE_FILENAME } from "@root/constants"
import { BaseIsomerError } from "@root/errors/BaseError"
import EmptyStringError from "@root/errors/EmptyStringError"
import MissingResourceRoomError from "@root/errors/MissingResourceRoomError"
import { NotFoundError } from "@root/errors/NotFoundError"
import { ResourceRoomDirectoryService } from "@root/services/directoryServices/ResourceRoomDirectoryService"
import {
  CollectionPageName,
  ContactUsPageName,
  HomepageName,
  PageName,
  ResourceCategoryPageName,
  ResourceRoomName,
  StagingPermalink,
  SubcollectionPageName,
  UnlinkedPageName,
  PathInfo,
  Homepage,
  PageInfo,
  ContactUsPage,
  CollectionPage,
  SubcollectionPage,
  ResourceCategoryPage,
  UnlinkedPage,
} from "@root/types/pages"
import { Brand } from "@root/types/util"

import { CollectionPageService } from "./CollectionPageService"
import { ContactUsPageService } from "./ContactUsPageService"
import { HomepagePageService } from "./HomepagePageService"
import { ResourcePageService } from "./ResourcePageService"
import { SubcollectionPageService } from "./SubcollectionPageService"
import { UnlinkedPageService } from "./UnlinkedPageService"

// NOTE: This handler retrieves data from github then parses it
// and it should handle the errors appropriately.
// We return `BaseIsomerError` as a stop gap measure but in the future,
// this should return a sum type of the possible errors.
// This is (at a glance), either a failure to read from github
// or the parsing fails (we have a sentinel value of an empty string)
const withErrorHandler = (promise: Promise<PageInfo>) =>
  ResultAsync.fromPromise(promise, () => new BaseIsomerError()).andThen(
    (data) =>
      // NOTE: This is a fail-safe check as `yaml.parse`
      // doesn't guarantee existence.
      data?.content?.frontMatter?.permalink
        ? ok(data)
        : err(new BaseIsomerError())
  )

const extractStagingPermalink = (stagingLink: string) => ({
  content,
}: PageInfo): StagingPermalink =>
  Brand.fromString(`${stagingLink}${content.frontMatter.permalink}`)

interface PageServiceProps {
  contactUsService: ContactUsPageService
  collectionPageService: CollectionPageService
  subCollectionPageService: SubcollectionPageService
  homepageService: HomepagePageService
  resourcePageService: ResourcePageService
  unlinkedPageService: UnlinkedPageService
  resourceRoomDirectoryService: ResourceRoomDirectoryService
}

// eslint-disable-next-line import/prefer-default-export
export class PageService {
  private contactUsService: ContactUsPageService

  private collectionPageService: CollectionPageService

  private subCollectionPageService: SubcollectionPageService

  private homepageService: HomepagePageService

  private resourcePageService: ResourcePageService

  private unlinkedPageService: UnlinkedPageService

  private resourceRoomDirectoryService: ResourceRoomDirectoryService

  constructor({
    contactUsService,
    collectionPageService,
    subCollectionPageService,
    homepageService,
    resourcePageService,
    unlinkedPageService,
    resourceRoomDirectoryService,
  }: PageServiceProps) {
    this.contactUsService = contactUsService
    this.collectionPageService = collectionPageService
    this.subCollectionPageService = subCollectionPageService
    this.homepageService = homepageService
    this.resourcePageService = resourcePageService
    this.unlinkedPageService = unlinkedPageService
    this.resourceRoomDirectoryService = resourceRoomDirectoryService
  }

  /**
   * This method assumes that only 1 call to `_config.yml` is needed
   * to determine a page's name.
   *
   * In order for this assumption to hold true, we maintain the invariant that
   * the method call **must always** act upon some existing fully qualified file path from
   * the frontend.
   *
   * This is done to avoid expensive calls to fetch a page's raw blob data and
   * parsing it thereafter which, for big files, might be expensive.
   * @param pageName A **valid and fully qualified** file path
   * @param sessionData session credentials of the user
   */
  parsePageName = (
    pageName: string,
    sessionData: UserSessionData
  ): ResultAsync<PageName, NotFoundError | MissingResourceRoomError> =>
    this.parseHomepage(pageName)
      // NOTE: Order is important as `contact-us` and unlinked pages
      // are both rooted at `/pages`
      .orElse(() => this.parseContactUsPage(pageName))
      .orElse(() => this.parseUnlinkedPages(pageName))
      .asyncAndThen<PageName, NotFoundError>(okAsync)
      // NOTE: We read the `_config.yml` to determine if it is a resource page.
      // If it is not, we assume that this is a collection page.
      // Because this method is invoked on existing file paths from the frontend,
      // this assumption will hold true.
      .orElse(() => this.parseResourceRoomPage(pageName, sessionData))
      .orElse(() => this.parseCollectionPage(pageName))

  // NOTE: Collection pages can be nested in either a collection: a/collection
  // or within a sub-collection: a/sub/collection
  private parseCollectionPage = (
    pageName: string
  ): ResultAsync<CollectionPageName | SubcollectionPageName, NotFoundError> =>
    this.extractPathInfo(pageName)
      .asyncAndThen(({ name, path }) =>
        path.asyncAndThen<
          CollectionPageName | SubcollectionPageName,
          NotFoundError
        >((rawPath) => {
          // NOTE: Only 2 levels of nesting
          if (rawPath.length > 2) {
            return errAsync(new NotFoundError())
          }
          if (rawPath.length === 1 && !!rawPath[0]) {
            return okAsync({
              name: Brand.fromString(name),
              collection: rawPath[0],
              kind: "CollectionPage",
            })
          }
          if (rawPath.length === 2 && !!rawPath[0] && !!rawPath[1]) {
            return okAsync({
              name: Brand.fromString(name),
              collection: rawPath[0],
              subcollection: rawPath[1],
              kind: "SubcollectionPage",
            })
          }
          return errAsync(new NotFoundError())
        })
      )
      .mapErr(() => new NotFoundError())

  private parseHomepage = (
    pageName: string
  ): Result<HomepageName, NotFoundError> =>
    this.extractPathInfo(pageName).andThen<HomepageName, NotFoundError>(
      ({ name, path }) => {
        if (path.isErr() && name === HOMEPAGE_FILENAME) {
          return ok({ name: Brand.fromString(name), kind: "Homepage" })
        }
        return err(new NotFoundError())
      }
    )

  // NOTE: The contact us page has a fixed structure
  // It needs to be rooted at `/pages/contact-us`
  private parseContactUsPage = (
    pageName: string
  ): Result<ContactUsPageName, NotFoundError> =>
    this.extractPathInfo(pageName).andThen<ContactUsPageName, NotFoundError>(
      ({ name, path }) => {
        if (
          path.isOk() &&
          path.value.pop() === "pages" &&
          name === CONTACT_US_FILENAME
        ) {
          return ok({ name: Brand.fromString(name), kind: "ContactUsPage" })
        }
        return err(new NotFoundError())
      }
    )

  private parseUnlinkedPages = (
    pageName: string
  ): Result<UnlinkedPageName, NotFoundError> =>
    this.extractPathInfo(pageName)
      .andThen(({ path, name }) =>
        path
          .map((rawPath) => rawPath.length === 1 && rawPath[0] === "pages")
          .andThen<UnlinkedPageName, NotFoundError>((isPages) =>
            isPages
              ? ok({ name: Brand.fromString(name), kind: "UnlinkedPage" })
              : err(new NotFoundError())
          )
      )
      // NOTE: If there's no containing folder, it's not an unlinked page.
      .mapErr(() => new NotFoundError())

  // NOTE: All resource room pages are pre-fixed by the resource room name.
  // The page can be nested 1 or 2 levels deep:
  // eg: one/level or two/levels/deep
  private parseResourceRoomPage = (
    pageName: string,
    sessionData: UserSessionData
  ): ResultAsync<
    ResourceCategoryPageName,
    NotFoundError | MissingResourceRoomError
  > =>
    this.extractResourceRoomName(sessionData).andThen((name) =>
      this.extractResourcePageName(name, pageName, sessionData)
    )

  private extractResourcePageName = (
    resourceRoomName: ResourceRoomName,
    pageName: string,
    sessionData: UserSessionData
  ): ResultAsync<ResourceCategoryPageName, NotFoundError> =>
    this.extractPathInfo(pageName)
      .asyncAndThen(({ name, path }) =>
        path.asyncAndThen<ResourceCategoryPageName, NotFoundError>(
          (rawPath) => {
            if (rawPath[0] !== resourceRoomName.name) {
              return errAsync(new NotFoundError())
            }

            if (rawPath.length !== 3 && rawPath.at(-1) !== "_posts") {
              return errAsync(new NotFoundError())
            }

            // NOTE: We need to read the frontmatter and check the layout.
            // The `layout` needs to be `post` for us to give a staging url
            // as the others are either an ext link or a file.
            // Because we only have the filename at this point, it is
            // insufficient to use that to determine the resource type.
            // This is because the actual underlying resource can be
            // named totally differently from the containing github file.
            return ResultAsync.fromPromise(
              this.resourcePageService.read(sessionData, {
                fileName: name,
                resourceRoomName: resourceRoomName.name,
                resourceCategoryName: rawPath[1],
              }),
              () => new NotFoundError()
            ).andThen<ResourceCategoryPageName, NotFoundError>(
              ({ content }) => {
                if (content.frontMatter.layout !== "post")
                  return errAsync(new NotFoundError())
                return okAsync({
                  name: Brand.fromString(name),
                  resourceRoom: resourceRoomName.name,
                  resourceCategory: rawPath[1],
                  kind: "ResourceCategoryPage",
                })
              }
            )
          }
        )
      )
      // NOTE: If we get an empty string as the `pageName`,
      // we just treat the file as not being found
      .mapErr(() => new NotFoundError())

  // NOTE: This is a safe wrapper over the js file for `getResourceRoomDirectoryName`
  extractResourceRoomName = (
    sessionData: UserSessionData
  ): ResultAsync<ResourceRoomName, MissingResourceRoomError> =>
    ResultAsync.fromPromise(
      this.resourceRoomDirectoryService.getResourceRoomDirectoryName(
        sessionData
      ),
      // NOTE: Assumed that errors are of a 4xx nature rather than 5xx
      () => new MissingResourceRoomError()
    ).andThen<ResourceRoomName, MissingResourceRoomError>(
      ({ resourceRoomName }: { resourceRoomName: string }) =>
        // NOTE: Underlying service can return this as `null` or as an empty string
        resourceRoomName
          ? ok({
              name: Brand.fromString(resourceRoomName),
              kind: "ResourceRoomName",
            })
          : err(new MissingResourceRoomError())
    )

  extractPathInfo = (pageName: string): Result<PathInfo, EmptyStringError> => {
    if (!pageName) {
      return err(new EmptyStringError())
    }

    const fullPath = pageName.split("/")
    // NOTE: Name is guaranteed to exist
    // as this method only accepts a string
    // and we've validated that the string is not empty
    const name = fullPath.pop()!

    if (fullPath.length === 0) {
      return ok({
        name,
        path: err([]),
      })
    }

    return ok({
      name,
      path: ok(fullPath),
    })
  }

  retrieveStagingPermalink = (
    sessionData: UserSessionData,
    stagingLink: StagingPermalink,
    pageName: PageName
  ): ResultAsync<StagingPermalink, BaseIsomerError> => {
    const withPermalink = extractStagingPermalink(stagingLink)
    switch (pageName.kind) {
      // NOTE: For both collections and subcollections,
      // the service method will automatically append an `_`
      // in front of the collection name (which is reflected in the raw name here).
      case "CollectionPage": {
        return withErrorHandler(
          this.collectionPageService
            .read(sessionData, {
              fileName: pageName.name,
              collectionName: pageName.collection.slice(1),
            })
            .then((collectionPage) => collectionPage as CollectionPage)
        ).map(withPermalink)
      }
      case "SubcollectionPage": {
        return withErrorHandler(
          this.subCollectionPageService
            .read(sessionData, {
              fileName: pageName.name,
              collectionName: pageName.collection.slice(1),
              subcollectionName: pageName.subcollection,
            })
            .then((subcollectionPage) => subcollectionPage as SubcollectionPage)
        ).map(withPermalink)
      }
      case "ResourceCategoryPage": {
        return withErrorHandler(
          this.resourcePageService
            .read(sessionData, {
              fileName: pageName.name,
              resourceCategoryName: pageName.resourceCategory,
              resourceRoomName: pageName.resourceRoom,
            })
            .then(
              (resourceCategoryPage) =>
                resourceCategoryPage as ResourceCategoryPage
            )
        ).map(withPermalink)
      }
      case "Homepage": {
        return withErrorHandler(
          this.homepageService
            .read(sessionData)
            .then((homepage) => homepage as Homepage)
        ).map(withPermalink)
      }
      case "ContactUsPage": {
        return withErrorHandler(
          this.contactUsService
            .read(sessionData)
            .then((contactUsPage) => contactUsPage as ContactUsPage)
        ).map(withPermalink)
      }
      case "UnlinkedPage": {
        return withErrorHandler(
          this.unlinkedPageService
            .read(sessionData, {
              fileName: pageName.name,
            })
            .then((unlinkedPage) => unlinkedPage as UnlinkedPage)
        ).map(withPermalink)
      }
      default: {
        const error: never = pageName
        throw new Error(
          `Expected all cases to be matched for page types. Received ${error}`
        )
      }
    }
  }
}
