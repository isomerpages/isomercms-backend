const yaml = require("yaml")

import CollectionsHandler from "../route-handlers/CollectionsHandler"
import SubfolderHandler from "../route-handlers/SubfolderHandler"
import CollectionPagesHandler from "../route-handlers/CollectionPagesHandler"
import PagesHandler from "../route-handlers/PagesHandler"
const { deslugifyCollectionName } = require("@utils/utils")

class MoverService {
  /**
   * @constructor
   * @param accessToken
   * @param siteName
   */
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async moveCollectionPages(dirPath, newDirPath, pages) {
    const dirPathTokens = dirPath.split('/')
    const newDirPathTokens = dirPath.split('/')

    const collectionName = dirPathTokens[0]
    const newCollectionName = newDirPathTokens[0]
    const isFromPages = collectionName === "pages"
    const isToPages = newCollectionName === "pages"
    const subfolder = dirPathTokens[1]
    const newSubfolder = newDirPathTokens[1]

    // Check if collection already exists
    const collectionsHandler = new CollectionsHandler(this.accessToken, this.siteName)
    const collections = await collectionsHandler.list()

    if (
      !collections.includes(newCollectionName) &&
      !isToPages
    ) {
      await collectionsHandler.create(newCollectionName)
    }

    // Check if subfolder already exists
    if (newSubfolder){
      const subfolderHandler = new SubfolderHandler(this.accessToken, this.siteName)
      const subfolders = await subfolderHandler.list(newCollectionName)
      if (!subfolders.includes(newSubfolder)) {
        await subfolderHandler.create(newCollectionName, newSubfolder)
      }
    }

    const oldHandler = isFromPages ? new PagesHandler(this.accessToken, this.siteName) :
      new CollectionPagesHandler(this.accessToken, this.siteName)
    const newHandler = isToPages ? new PagesHandler(this.accessToken, this.siteName) :
      new CollectionPagesHandler(this.accessToken, this.siteName)

    // Create and delete files
    // To fix after refactoring
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    // We can't perform these operations concurrently because of conflict issues
    for (const fileName of pages) {
      // Delete old file
      const signature = isFromPages ? [fileName] : [collectionName, `${subfolder}/${fileName}`]
      const newSignature = isToPages ? [fileName] : [collectionName, `${subfolder}/${fileName}`]
      const { content, sha } = oldHandler.read(...signature)
      await oldHandler.delete(...[signature], sha)

      if (newSubfolder || subfolder) {
        // Adding third nav to front matter, to be removed after template rewrite

        // eslint-disable-next-line no-unused-vars
        const [unused, encodedFrontMatter, pageContent] = content.split("---")
        const frontMatter = yaml.parse(encodedFrontMatter)
        if (newSubfolder)
          frontMatter.third_nav_title = deslugifyCollectionName(
            newSubfolder
          )
        else delete frontMatter.third_nav_title
        const newFrontMatter = yaml.stringify(frontMatter)
        const newContent = ["---\n", newFrontMatter, "---", pageContent].join("")
        await newHandler.create(...newSignature, newContent)
      } else {
        await newHandler.create(...newSignature, content)
      }
    }

    // Delete subfolder
  }
}

export default MoverService