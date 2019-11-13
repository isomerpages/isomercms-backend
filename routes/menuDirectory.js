// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')
const Bluebird = require('bluebird')

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

      /**
       * This tokenizes the items loaded from `navigation.yml`
       * into these types:
       * `page` - Simple pages
       * `collection` - Collection pages
       * `resource room` - Resource room pages
       */

      let directory = navItems.map(item => {
        // If navigation item has a url it links to a simple page / external page
        // For now it defaults to a simple page
        // TODO know if it links to an external page
        if (item.url) {
          const fileName = item.title.toLowerCase().replace(" ", "-") + ".md"
          return {
            type: 'page',
            title: fileName,
            path: encodeURIComponent(new PageType().getFolderName() + fileName)
          }
        } else if (item.collection) {
          return {
            type: 'collection',
            title: item.collection
          }
        } else if (item.resource_room) {
          return {
            type: 'resource room',
            name: item.title,
            title: item.title
          }
        }

        return item
      });

      /**
       * This function then loops through the directory items
       * to find items of type `collection`, and retrieve the 
       * relevant `collection-page`(s) & groups them up into
       * `thirdnav` groups when necessary
       */
      directory = await Bluebird.map(directory, async item => {
        if (item.type === 'collection') {
          const CollectionFile = new File(access_token, siteName)
          const collectionPageType = new CollectionPageType(item.title)
          CollectionFile.setFileType(collectionPageType)
          let collectionPages = await CollectionFile.list()

          /**
           * Within the listed collection pages, we need to group them up
           * into their respective thirdnav groups
           */
          collectionPages = await Bluebird.reduce(collectionPages, async (accumulator, collectionPage) => {
            /**
             * Files such as `2c-filename.md` will be split
             * by the `-` and checked if it's part of a thirdnav group
             * Collection pages that are part of a thirdnav contains a letter
             * after their group number (i.e `c` in `2c-filename.md`)
             * Link: https://isomer.gov.sg/documentation/navbar-and-footer/creating-3rd-level-nav/
             */
            const identifier = collectionPage.fileName.split("-")[0]
            const isThirdnav = /[0-9][a-z]/.test(identifier)

            /**
             * `canCreateThirdnav` is to check if the filename indicates
             * a need to create a new thirdnav group to store it in
             * (i.e `1a-filename.md` is the start of a new thirdnav
             * while `1b-filename.md` is not)
             */
            const canCreateThirdnav = /[0-9]a$/.test(identifier)
        
            // Treat it as a normal collection page and proceed to the next item
            if (!isThirdnav) {
               accumulator.push({path: collectionPage.path, type: 'collection-page', title: collectionPage.fileName}) 
               return accumulator
            }
        
            // Create a thirdnav object
            if (canCreateThirdnav) {
              // Retrieve third_nav_title from frontmatter in the thirdnav page
              const { content } = await CollectionFile.read(collectionPage.fileName)
              const frontMatter = yaml.safeLoad(base64.decode(content).split('---')[1]);
              accumulator.push({ title: `${frontMatter.third_nav_title}`, type: "thirdnav", children: [] })
            }
        
            /**
             * If the program gets this far, it would mean the item is a thirdnav-page and is
             * meant to be part of the last thirdnav in `accumulator`
             */
            const lastSubCollectionIndex = accumulator.length - 1
            accumulator[lastSubCollectionIndex].children.push({path: collectionPage.path, title: collectionPage.fileName, type: 'thirdnav-page'})
            
            return accumulator
          }, [])

          // Return the fully branched out collection
          return {
            type: item.type,
            title: item.title,
            children: collectionPages
          }
        }
        return item
      })

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