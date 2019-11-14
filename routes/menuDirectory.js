// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')
const Bluebird = require('bluebird')

const { PageType, File, CollectionPageType, MenuType } = require('../classes/File')
const { Collection } = require('../classes/Collection')
const { ResourceRoom } = require('../classes/ResourceRoom')
const { collectionPageAggregator } = require('../utils/menu-utils')
const { deslugifyCollectionName } = require('../utils/utils')

// Read tree of directory
router.get('/:siteName/tree', async function(req, res, next) {
    try {
      // variables to keep track of whether there are simple pages or 
      // resources in the navigation bar
      let navHasSimplePage = false;
      let navHasResources = false;
      // variable to store unlinked pages
      let unlinkedPages;
      // variable to keep track of collections in the nav bar
      let collections = [];
      let unlinkedCollections = [];
      // object to accumulate what to send back as response
      let response = {};

      // verify credentials
      const { oauthtoken } = req.cookies
      const { access_token } = jwtUtils.verifyToken(oauthtoken)
      const { siteName } = req.params
  
      // read the _data/navigation.yml file
      const IsomerNavFile = new File(access_token, siteName)
      IsomerNavFile.setFileType(new MenuType())
      const { content } = await IsomerNavFile.read('navigation.yml')

      const navItems = yaml.safeLoad(base64.decode(content)).links;

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
          // navigation contains simple page
          navHasSimplePage = true;

          // this is the wrong way to do it, we should look at how exactly the titles are slugified
          const fileName = item.title.toLowerCase().replace(" ", "-") + ".md"
          return {
            type: 'page',
            title: item.title,
            path: encodeURIComponent(new PageType().getFolderName() + fileName),
            url: item.url,
          }
        } else if (item.collection) {
          // keep track of list of collections in navigation bar
          collections.push(item.collection)
          return {
            type: 'collection',
            title: item.title,
            collection: item.collection,
          }
        } else if (item.resource_room) {
          // navigation contains resource room
          navHasResources = true
          return {
            type: 'resource room',
            title: item.title,
          }
        }

        return item
      });

      /**
       * This function then loops through the directory item
       * to find items of type `collection`, and retrieve the 
       * relevant `collection-page`(s) & groups them up into
       * `thirdnav` groups when necessary
       */
      directory = await Bluebird.map(directory, async item => {
        if (item.type === 'collection') {
          return collectionPageAggregator(item, access_token, siteName)
        }
        return item
      })

      // check whether simple pages are linked in the navigation bar
      if (navHasSimplePage) {
        // get all files in pages folder in the repo
        const IsomerPageFile = new File(access_token, siteName)
        IsomerPageFile.setFileType(new PageType())
        const pages = await IsomerPageFile.list()

        // get the list of pages which are not linked in the navigation bar
        const linkedPages = directory.filter(item => item.type === 'page')
        unlinkedPages = _.differenceBy(pages, linkedPages, 'fileName') // THIS IS WRONG
      } else {
        unlinkedPages = pages
      }
      
      // add directory and unlinkedPages to response since they must both exist
      Object.assign(response, {
        directory,
        unlinked: {
          unlinkedPages,
        },
      })

      // check whether resources are linked in the navigation bar
      // if they are not linked, include resources in the unlinked section
      if (!navHasResources) {
        const resourceRoomName = await(new ResourceRoom(access_token, siteName)).get()
        Object.assign(response.unlinked, {
          resourceRoom: {
            type: 'resource room',
            title: resourceRoomName,
          },
        })
      }


      // get the list of collections which are not linked in the navigation bar
      const repoCollections = await (new Collection(access_token, siteName)).list()
      unlinkedCollections = _.differenceBy(repoCollections, collections)

      // if there are any unlinked collections, generate the same data structure
      if (unlinkedCollections.length > 0) {
        // create an array of collection items to mimic what is received from navigation.yml
        unlinkedCollections = unlinkedCollections.map((collection) => ({
          type: 'collection',
          title: deslugifyCollectionName(collection), // convert collection name into title
          collection,
        }))

        // go through the whole process of generating a directory
        unlinkedCollections = await Bluebird.map(unlinkedCollections, async item => (
          collectionPageAggregator(item, access_token, siteName)
        ))
  
        unlinkedCollections.forEach((collection) => {
          Object.assign(response.unlinked, {
            [collection.title]: collection,
          })
        })
      }
      
      res.status(200).json(response)
    } catch (err) {
      console.log(err)
    }
  })

module.exports = router