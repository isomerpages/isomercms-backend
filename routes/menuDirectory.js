// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')

const { PageType, File, CollectionPageType, MenuType } = require('../classes/File')

// Read tree of directory
router.get('/:siteName/tree', async function(req, res, next) {
    try {
      const { oauthtoken } = req.cookies
      const { access_token } = jwtUtils.verifyToken(oauthtoken)
  
      const { siteName } = req.params
  
      const IsomerNavFile = new File(access_token, siteName)
      IsomerNavFile.setFileType(new MenuType())
      const { content } = await IsomerNavFile.read('navigation.yml')
      const navItems = yaml.safeLoad(base64.decode(content)).links

      // Stores content of the collections tree
      let IsomerCollectionTreeFile = new File(access_token, siteName)
      IsomerCollectionTreeFile.setFileType(new MenuType())
      IsomerCollectionTreeFile.setBranchRef("cms-test")
      const { content: collectionsContent } = await IsomerCollectionTreeFile.read('collections.yml')
      const { collections } = yaml.safeLoad(base64.decode(collectionsContent))
      /**
       * This tokenizes the items loaded from `navigation.yml`
       * into these types:
       * `page` - Simple pages
       * `collection` - Collection pages
       * `resource room` - Resource room pages
       */

      let directory = navItems.map(navItem => {
        // If navigation item has a url it links to a simple page / external page
        // For now it defaults to a simple page
        // TODO know if it links to an external page
        if (navItem.url) {
          const fileName = navItem.title.toLowerCase().replace(" ", "-") + ".md"
          return {
            type: 'page',
            name: fileName,
            path: encodeURIComponent(new PageType().getFolderName() + fileName)
          }
        } else if (navItem.collection) {
          // Find corresponding entry from navigation.yml and matches up with collections.yml
          let { children } = collections.filter(({ collection }) => collection === navItem.collection)[0]

          /**
           * Parses and groups up the thirdnav entries
           */
          children = children.reduce((accumulator, collectionPage) => {
            if (collectionPage.type === "collection-page") {
              accumulator.push(collectionPage)
              return accumulator
            }

            if (accumulator.length === 0 || accumulator[accumulator.length - 1].type !== "thirdnav") {
              accumulator.push({
                title: collectionPage.thirdnav,
                type: "thirdnav",
                children: [],
              })
            }

            accumulator[accumulator.length - 1].children.push(collectionPage)
            return accumulator
          }, [])

          return {
            type: 'collection',
            children,
            title: navItem.collection
          }
        } else if (navItem.resource_room) {
          return {
            type: 'resource room',
            name: navItem.title,
            title: navItem.title
          }
        }

        return navItem
      });

      const IsomerPageFile = new File(access_token, siteName)
      IsomerPageFile.setFileType(new PageType())
      const pages = await IsomerPageFile.list()
      const linkedPages = directory.filter(item => item.type === 'page')
      const unlinkedPages = _.differenceBy(pages, linkedPages, 'fileName')
      
      res.status(200).json({ directory , unlinkedPages })
    } catch (err) {
      console.log(err)
    }
  })

module.exports = router