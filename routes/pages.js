const express = require('express');
const router = express.Router();
const axios = require('axios');
// const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

// List pages
router.get('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const pagesFolderPath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages`

    const resp = await axios.get(pagesFolderPath, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    if (resp.status !== 200) throw new Error ('The pages folder cannot be found.')

    const pages = resp.data.map(object => {
      const pathUriEncoded = encodeURIComponent(object.path)
      const pathNameSplit = object.path.split("/")
      const fileName = pathNameSplit[pathNameSplit.length - 1]
      if (object.type === 'file') {
        return { 
          link: `${FRONTEND_URL}/sites/${siteName}/files/${pathUriEncoded}`,
          fileName
        }
      }
    })

    res.status(200).json({ pages: _.compact(pages) })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Create new page
router.post('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { pageName, content } = req.body

    // TO-DO:
    // Validate pageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${pageName}`

    let params = {
      "message": `Create page: ${pageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ pageName, content })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Read page
router.get('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${pageName}`

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

    res.status(200).json({ pageName, sha, content })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Update page
router.post('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${pageName}`

    let params = {
      "message": `Updating page: ${pageName}`,
      "content": content,
      "branch": "staging",
      "sha": sha
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ pageName, content })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Delete page
router.delete('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { sha } = req.body

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${pageName}`

    let params = {
      "message": `Deleting page: ${pageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(filePath, {
      data: params,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ pageName })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Rename page
router.post('/:siteName/pages/:pageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { newPageName, sha, content } = req.body

    // TO-DO:
    // Validate pageName and content

    // Create new file with name ${newPageName}

    const newFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${newPageName}`

    let params = {
      "message": `Create page: ${newPageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(newFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    // Delete existing file with name ${pageName}
    const currFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages/${pageName}`

    let deleteParams = {
      "message": `Deleting page: ${pageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(currFilePath, {
      data: deleteParams,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ newPageName })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

module.exports = router;