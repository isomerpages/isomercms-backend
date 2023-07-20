import { Brand, FileNameBrand, ToBrand } from "./util"

export type ResourceRoomName = FileNameBrand<"ResourceRoomName">

export type SubcollectionPageName = FileNameBrand<"SubcollectionPage"> & {
  collection: string
  subcollection: string
  kind: "SubcollectionPage"
}

export type CollectionPageName = FileNameBrand<"CollectionPage"> & {
  collection: string
}

export type ContactUsPageName = FileNameBrand<"ContactUsPage">

export type UnlinkedPageName = FileNameBrand<"UnlinkedPage">

export type HomepageName = FileNameBrand<"Homepage">

export type ResourceCategoryPageName = FileNameBrand<"ResourceCategoryPage"> & {
  resourceRoom: ToBrand<ResourceRoomName, "name">
  resourceCategory: string
}

export type PageName =
  | SubcollectionPageName
  | CollectionPageName
  | ContactUsPageName
  | UnlinkedPageName
  | HomepageName
  | ResourceCategoryPageName

// NOTE: This type is a limited sub-type of the raw pages data
// returned by the various page level services.
// This maps to the logical return type of `retrieveDataFromMarkdown`
// in `markdown-utils.js`
// This type **might be wrong**.
export type PageInfo = {
  content: {
    frontMatter: {
      // NOTE: Frontend enforces this hence pages
      // created through the CMS should always have
      // a permalink (default: `permalink`) or an empty string
      // if the parsing fails
      permalink: string
    }
    pageBody: string
  }
  sha: string
}

export type ResourcePageInfo = PageInfo & {
  content: {
    frontMatter: {
      layout: "file" | "post" | "link"
    }
  }
}

export type ContactUsPage = Brand<PageInfo, "ContactUsPage">

export type Homepage = Brand<PageInfo, "Homepage">

export type CollectionPage = PageInfo & {
  fileName: CollectionPageName
}

export type SubcollectionPage = PageInfo & {
  fileName: SubcollectionPageName
}

export type ResourceCategoryPage = PageInfo & {
  fileName: ResourceCategoryPageName
}

export type UnlinkedPage = PageInfo & {
  fileName: UnlinkedPageName
}

export type StagingPermalink = Brand<string, "staging">
export type ProdPermalink = Brand<string, "prod">

// NOTE: This is not `frontMatter.permalink` as this
// also includes the respective base url in front.
export type FullPermalink = StagingPermalink | ProdPermalink
