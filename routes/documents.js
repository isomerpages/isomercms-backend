const express = require('express');
const router = express.Router();
const axios = require('axios');
// const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL

// List documents
router.get('/:siteName/documents', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const filesFolderPath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/files`

    const resp = await axios.get(filesFolderPath, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    if (resp.status !== 200) throw new Error ('The documents/files folder cannot be found.')

    const files = resp.data.map(object => {
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
    
    res.status(200).json({ files: _.compact(files) })
  } catch (err) {
    console.log(err)
  }
})

// Create new document
router.post('/:siteName/documents', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { documentName, content } = req.body

    // TO-DO:
    // Validate fileName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${documentName}`

    let params = {
      "message": `Create document: ${documentName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read document
router.get('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${documentName}`

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

    res.status(200).json({ fileName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update document
router.post('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${documentName}`

    let params = {
      "message": `Updating document: ${documentName}`,
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

    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Delete document
router.delete('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { sha } = req.body

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${documentName}`

    let params = {
      "message": `Deleting document: ${documentName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename document
router.post('/:siteName/documents/:documentName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { newFileName, sha, content } = req.body

    // TO-DO:
    // Validate documentName and content

    // Create new document with name ${newDocumentName}

    const newFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${newDocumentName}`

    let params = {
      "message": `Create document: ${newDocumentName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(newFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    // Delete existing document with name ${documentName}
    const currFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${documentName}`

    let params = {
      "message": `Deleting document: ${documentName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(currFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ newDocumentName, content })
  } catch (err) {
    console.log(err)
  }
})


module.exports = router;