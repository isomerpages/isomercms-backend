const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL

// Create new page in resource
router.post('/:siteName/resources/:resourceName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, resourceName } = req.params
    const { pageName, content } = req.body

    // TO-DO:
    // Validate that resource exists
    // Validate pageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/_${resourceName}/${pageName}`

    let params = {
      "message": `Create resource page: ${pageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ resourceName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read page in resource
router.get('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/_${resourceName}/${pageName}`

    const resp = await axios.get(filePath, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    if (resp.status === 404) throw new Error ('Page does not exist')

    const content = resp.data.content
    const sha = resp.data.sha

    // TO-DO:
    // Validate content

    res.status(200).json({ resourceName, pageName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Delete page in resource
router.delete('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { sha } = req.body

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/_${resourceName}/${pageName}`

    let params = {
      "message": `Deleting resource page: ${pageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ resourceName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename page in resource
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { newPageName, sha, content } = req.body

    // TO-DO:
    // Validate that resource exists
    // Validate pageName and content

    // Create new resource page with name ${newPageName}

    const newFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/_${resourceName}/${newPageName}`

    let params = {
      "message": `Create resource page: ${newPageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(newFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    // Delete existing resource page with name ${pageName}
    const currFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/_${resourceName}/${pageName}`

    let params = {
      "message": `Deleting resource page: ${pageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(currFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ newPageName, content })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;