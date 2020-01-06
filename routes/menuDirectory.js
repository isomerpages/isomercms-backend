// A route to show the tree structure of the pages and collections directory
const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const axios = require('axios')
const { slugifyThirdNavPage, slugifyCollectionPage } = require('../utils/utils')
const slugify = require('slugify')

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
      // await IsomerTreeMenu.getUnlinkedPages()
      
      // const response = {
      //   directory: IsomerTreeMenu.directory,
      //   unlinked: IsomerTreeMenu.unlinked,
      // }
      await IsomerTreeMenu.getTree();
      
      // filter tree to get collections

      await IsomerTreeMenu.getLinkedPages()
      const response = {
        currentCommitSha: IsomerTreeMenu.currentCommitSha,
        gitTree: IsomerTreeMenu.tree,
      };

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
    const currentCommitSha = commits[0].sha

    const { data: { tree: gitTree } } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/git/trees/${treeSha}?recursive=1`)

    // Converts tree from an array to a map with the path of each item being the key
    const gitDirectory = gitTree.reduce((accumulator, item) => {
      accumulator[item.path] = item
      return accumulator
    }, {})
    const gitDirectoryClone = Object.assign({}, gitDirectory)

    // Goes through the tree sent from frontend
    tree.items[`root-Main Menu`].children.forEach(childId => {
      let child = tree.items[childId]
      let { data: { type: childType, title } } = child
      switch(childType) {
        case 'page':
        case 'resource room':
          break;
        case 'collection':
          const collectionName = slugify(title)
          const collectionPageIds = child.children
          collectionPageIds.forEach((collectionPageId, index) => {
            const collectionPage = tree.items[collectionPageId].data
            if (collectionPage.type === 'thirdnav') {
              const thirdNavIds = collectionPage.children
              thirdNavIds.forEach((thirdNavId, thirdNavIndex) => {
                const thirdNavPage = tree.items[thirdNavId].data
                const thirdNavPagePath = decodeURIComponent(thirdNavPage.path)
                gitDirectory[thirdNavPagePath].path = slugifyThirdNavPage(collectionName, thirdNavPage.title, index, String.fromCharCode(97+thirdNavIndex))
              })
            } else {
              // It is a collection page
              const collectionPagePath = decodeURIComponent(collectionPage.path)
              gitDirectory[collectionPagePath].path = slugifyCollectionPage(collectionName, collectionPage.title, index)
            }
          })
          break;
        default:
          break;
      }
    });
    const newTree = Object.values(gitDirectory)
    const h =2

    const { data: { sha: newTreeSha } } = await axios.post(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/git/trees`, {
      tree: gitTree
    },{
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    const baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/git/refs`
    const baseCommitEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/git/commits`
    const refEndpoint = `${baseRefEndpoint}/heads/staging`

    const newCommitResp = await axios.post(baseCommitEndpoint, {
        message: `Change w/ menu`,
        tree: newTreeSha,
        parents: [currentCommitSha]
      },{
        headers: {
          Authorization: `token ${access_token}`,
          "Content-Type": "application/json"
        }
      })

      const newCommitSha = newCommitResp.data.sha

      /**
       * The `staging` branch reference will now point
       * to `newCommitSha` instead of `currentCommitSha`
       */
      const newRefResp = await axios.patch(refEndpoint, {
        sha : newCommitSha
      }, {
        headers: {
          Authorization: `token ${access_token}`,
          "Content-Type": "application/json"
        }
      })


    console.log(treeSha);

  } catch (err) {
    console.log(err)
  }
})
module.exports = router