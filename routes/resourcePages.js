const express = require('express');
const router = express.Router();
// const axios = require('axios');
// const base64 = require('base-64');
// const jwtUtils = require('../utils/jwt-utils')
// const _ = require('lodash')

// const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const FRONTEND_URL = process.env.FRONTEND_URL

// Create new page in resource
router.post('/:siteName/resources/:resourceName/pages', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Read page in resource
router.get('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete page in resource
router.delete('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename page in resource
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;