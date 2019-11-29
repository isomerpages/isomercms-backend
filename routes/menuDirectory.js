// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const axios = require('axios')

// Import classes 
const { Tree } = require('../classes/Tree.js')
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

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

router.post('/:siteName/tree', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { tree } = req.body

    // Get the commits of the repo
    const { data: commits } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/commits`)
    // Get the tree sha of the latest commit
    const { commit: { tree: { sha: treeSha } } } = commits[0]

    const { data: { tree: gitTree } } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/git/trees/${treeSha}?recursive=1`)

    const gitDirectory = gitTree.reduce((accumulator, item) => {
      accumulator[item.path] = item
      return accumulator
    }, {})

    console.log(treeSha);

  } catch (err) {
    console.log(err)
  }
})
module.exports = router