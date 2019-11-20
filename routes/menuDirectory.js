// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { Tree } = require('../classes/Tree.js')

// Read tree of directory
router.get('/:siteName/tree', async function(req, res, next) {
    try {
      const { oauthtoken } = req.cookies
      const { access_token } = jwtUtils.verifyToken(oauthtoken)
      const { siteName } = req.params

      const IsomerTreeMenu = new Tree(access_token, siteName)
      await IsomerTreeMenu.getLinkedPages()
      await IsomerTreeMenu.getUnlinkedPages()
      
      const response = {
        directory: IsomerTreeMenu.directory,
        unlinked: IsomerTreeMenu.unlinked,
      }

      res.status(200).json(response)
    } catch (err) {
      console.log(err)
    }
  })

module.exports = router