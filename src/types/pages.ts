import { Result } from "neverthrow"

import { Brand, ToBrand } from "./util"

type NameInfo = {
  name: string
  kind: string
}

type PageBrand<T extends NameInfo> = ToBrand<T, "name">

export type ResourceRoomName = {
  name: string & { __kind: "ResourceRoomName" }
  kind: "ResourceRoomName"
}

export type SubcollectionPageName = {
  name: string & { __kind: "SubcollectionPage" }
  collection: string
  subCollection: string
  kind: "SubcollectionPage"
}

export type CollectionPageName = {
  name: string & { __kind: "CollectionPage" }
  collection: string
  kind: "CollectionPage"
}

export type ContactUsPageName = {
  name: string & { __kind: "ContactUsPage" }
  kind: "ContactUsPage"
}

export type UnlinkedPageName = {
  name: string & { __kind: "UnlinkedPage" }
  kind: "UnlinkedPage"
}

export type HomepageName = {
  name: string & { __kind: "Homepage" }
  kind: "Homepage"
}

export type ResourceCategoryPageName = {
  name: string & { __kind: "ResourceCategoryPage" }
  resourceRoom: ToBrand<ResourceRoomName, "name">
  resourceCategory: string
  kind: "ResourceCategoryPage"
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

// Homepage also
export type ContactUsPage = Brand<PageInfo, "ContactUsPage">

export type Homepage = Brand<PageInfo, "Homepage">

export type CollectionPage = PageInfo & {
  fileName: PageBrand<CollectionPageName>
}

export type SubcollectionPage = PageInfo & {
  fileName: PageBrand<SubcollectionPageName>
}

export type ResourceCategoryPage = PageInfo & {
  fileName: PageBrand<ResourceCategoryPageName>
}

export type UnlinkedPage = PageInfo & {
  fileName: PageBrand<UnlinkedPageName>
}

export type StagingPermalink = Brand<string, "staging">
export type ProdPermalink = Brand<string, "prod">

// NOTE: This is not `frontMatter.permalink` as this
// also includes the respective base url in front.
export type Permalink = StagingPermalink | ProdPermalink

export type PathInfo = {
  name: string
  path: Result<string[], never[]>
}
