const express = require('express');
const router = express.Router();
// const axios = require('axios');
// const base64 = require('base-64');
// const jwtUtils = require('../utils/jwt-utils')
// const _ = require('lodash')

// const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const FRONTEND_URL = process.env.FRONTEND_URL

// List resources
router.get('/:siteName/resources', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Create new resource
router.post('/:siteName/resources', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// List pages in resource
router.get('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete resource
router.delete('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename resource
router.post('/:siteName/resources/:resourceName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;