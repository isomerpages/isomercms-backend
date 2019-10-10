const express = require('express');
const router = express.Router();
const axios = require('axios');
// const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL

// List pages
router.get('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const pagesFolderPath = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/pages`

    const resp = await axios.get(pagesFolderPath, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    const pages = resp.data.map(object => {
      const pathUriEncoded = encodeURIComponent(object.path)
      const pathNameSplit = object.path.split("/")
      const fileName = pathNameSplit[pathNameSplit.length - 1]
      if (object.type === 'file') {
        return { 
          link: `${FRONTEND_URL}/sites/${siteName}/files/${pathUriEncoded}`,
          pageName: fileName
        }
      }
    })

    // Obtain content from a page on GitHub
    res.status(200).json({ pages: _.compact(pages) })
  } catch (err) {
    console.log(err)
  }
})

// Create new page
router.post('/:siteName/pages', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Read page
router.get('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Update page
router.post('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete page
router.delete('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename page
router.post('/:siteName/pages/:pageName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;