const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL

// List images
router.get('/:siteName/images', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const imagesFolderPath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/images`

    const resp = await axios.get(imagesFolderPath, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    if (resp.status !== 200) throw new Error ('The images folder cannot be found.')

    const images = resp.data.map(object => {
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
    
    res.status(200).json({ images: _.compact(images) })
  } catch (err) {
    console.log(err)
  }
})

// Create new image
router.post('/:siteName/images', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { imageName, content } = req.body

    // TO-DO:
    // Validate imageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${imageName}`

    let params = {
      "message": `Create page: ${imageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ imageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read image
router.get('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params

    // TO-DO:
    // Validate content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${imageName}`

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

    res.status(200).json({ imageName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update image
router.post('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate imageName and content

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${imageName}`

    let params = {
      "message": `Updating page: ${imageName}`,
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

    res.status(200).json({ imageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Delete image
router.delete('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params
    const { sha } = req.body

    const filePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${imageName}`

    let params = {
      "message": `Deleting page: ${imageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ imageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename image
router.post('/:siteName/images/:imageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params
    const { newImageName, sha, content } = req.body

    // TO-DO:
    // Validate imageName and content

    // Create new file with name ${newImageName}

    const newFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${newImageName}`

    let params = {
      "message": `Create page: ${newImageName}`,
      "content": content,
      "branch": "staging",
    }

    await axios.put(newFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    // Delete existing file with name ${imageName}
    const currFilePath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/page/${imageName}`

    let params = {
      "message": `Deleting page: ${imageName}`,
      "branch": "staging",
      "sha": sha
    }

    await axios.delete(currFilePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).json({ newImageName, content })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;