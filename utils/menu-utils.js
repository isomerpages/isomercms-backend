const Bluebird = require('bluebird')
const yaml = require('yaml')
const base64 = require('base-64')
const { File, CollectionPageType } = require('../classes/File')
const { deslugifyCollectionPage } = require('./utils')

// this takes an object and helps to aggregate it to the menu object
// depending on whether it is a collection or not
const pageAggregator = async (item, access_token, siteName) => {
  // handle collection objects
  if (item.type === 'collection') {
    // handle unlinked pages collection separately
    if (item.title === 'Unlinked Pages') {
      // unlinkedPages doesn't require a CollectionFile
      return thirdNavAggregator(item.collectionPages, undefined, item)
    }

    // list all pages in the collection
    const CollectionFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(item.collection)
    CollectionFile.setFileType(collectionPageType)
    const collectionPages = await CollectionFile.list()
    return thirdNavAggregator(collectionPages, CollectionFile, item)
  }

  // handle the rest (resources)
  return item
}

// this takes a collection and returns an object that contains
// all the items in the collection
const thirdNavAggregator = async (collectionPages, CollectionFile, item) => {
  /**
   * Within the listed collection pages, we need to group them up
   * into their respective thirdnav groups
   */
  const groupedCollectionPages = await Bluebird.reduce(collectionPages, async (accumulator, collectionPage) => {
    /**
     * Files such as `2c-filename.md` will be split
     * by the `-` and checked if it's part of a thirdnav group
     * Collection pages that are part of a thirdnav contains a letter
     * after their group number (i.e `c` in `2c-filename.md`)
     * Link: https://isomer.gov.sg/documentation/navbar-and-footer/creating-3rd-level-nav/
     */
    const identifier = collectionPage.fileName.split('-')[0]
    const isThirdnav = /^[0-9]+[a-z]/.test(identifier)

    /**
     * `canCreateThirdnav` is to check if the filename indicates
     * a need to create a new thirdnav group to store it in
     * (i.e `1a-filename.md` is the start of a new thirdnav
     * while `1b-filename.md` is not)
     */
    const canCreateThirdnav = /^[0-9]+a$/.test(identifier)

    // Treat it as a normal collection page and proceed to the next item
    if (!isThirdnav) {
      accumulator.push({
        path: collectionPage.path,
        type: 'collection-page',
        title: deslugifyCollectionPage(collectionPage.fileName)
      }) 
      return accumulator
    }

    // Create a thirdnav object
    if (canCreateThirdnav) {
      // Retrieve third_nav_title from frontmatter in the thirdnav page - this is slow
      const { content } = await CollectionFile.read(collectionPage.fileName);
      const frontMatter = yaml.parse(base64.decode(content).split('---')[1]);
      accumulator.push({
        title: frontMatter.third_nav_title,
        type: "thirdnav",
        children: []
      })
    }

    /**
     * If the program gets this far, it would mean the item is a thirdnav-page and is
     * meant to be part of the last thirdnav in `accumulator`
     */
    const lastSubCollectionIndex = accumulator.length - 1
    accumulator[lastSubCollectionIndex].children.push({
      path: collectionPage.path,
      title: deslugifyCollectionPage(collectionPage.fileName),
      type: 'thirdnav-page',
    })
    
    return accumulator
  }, [])

  // Return the fully branched out collection
  return {
    type: item.type,
    title: item.title,
    children: groupedCollectionPages,
  }
}

module.exports = {
  pageAggregator,
  thirdNavAggregator,
}
