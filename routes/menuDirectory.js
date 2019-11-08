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
            name: fileName,
            path: encodeURIComponent(new PageType().getFolderName() + fileName)
          }
        } else if (item.collection) {
          return {
            type: 'collection',
            name: item.collection
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
       * relevant "Sub Collections" or "Collection Pages"
       * `Promise.all()` was used as an async function was needed to 
       * retrieve the relevant items and `Promse.all` resolves when all
       * its array contents are resolved/rejected
       */
      directory = await Promise.all(directory.map(async item => {
        if (item.type === 'collection') {
          const IsomerFile = new File(access_token, siteName)
          const collectionPageType = new CollectionPageType(item.name)
          IsomerFile.setFileType(collectionPageType)
          let collectionPages = await IsomerFile.list()

          /**
           * Within the listed collection pages, we need to group them up
           * into their respective sub collections
           */
          collectionPages = collectionPages.reduce((accumulator, page) => {
            // Create a deep copy of the accumulated value
            let accumulatorCopy = [...accumulator]
            /**
             * Files such as `2c-filename.md` will be split
             * by the `-` and checked if it's part of a subcollection
             * Collection pages that are split into subcollections contains a letter
             * after their group number (i.e `c` in `2c-filename.md`)
             * Link: https://isomer.gov.sg/documentation/navbar-and-footer/creating-3rd-level-nav/
             */
            const identifier = page.fileName.split("-")[0]
            const isSubcollection = /[0-9][a-z]/.test(identifier)

            /**
             * `canCreateSubcollection` is to reflect the moment
             * a filename is start of a new subcollection
             * (i.e `1a-filename.md` is the start of a new subcollection
             * while `1b-filename.md` is not)
             */
            const canCreateSubcollection = /[0-9]a$/.test(identifier)
        
            // Treat it as a normal collection page and proceed to the next item
            if (!isSubcollection) {
               accumulatorCopy.push({...page, type: 'leftnav', name: page.fileName}) 
               return accumulatorCopy
            }
        
            // Create a subcollection object
            if (canCreateSubcollection) {
                accumulatorCopy.push({ type: "subcollection", children: [], name: "subcollection" })
            }
        
            /**
             * If the program gets this far, it would mean the item is
             * meant to be part of the last subcollection being populated in `accumulatorCopy`
             */
            const lastSubCollectionIndex = accumulatorCopy.length - 1
            accumulatorCopy[lastSubCollectionIndex].children.push({...page, name: page.fileName})
            
            return accumulatorCopy
          }, [])

          // Return the fully branched out collection
          return {
            type: item.type,
            name: item.name,
            children: collectionPages
          }
        }
        return item
      }))

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