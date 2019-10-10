const express = require('express');
const router = express.Router();
// const axios = require('axios');
// const base64 = require('base-64');
// const jwtUtils = require('../utils/jwt-utils')
// const _ = require('lodash')

// const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const FRONTEND_URL = process.env.FRONTEND_URL

// List files
router.get('/:siteName/files', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Create new file
router.post('/:siteName/files', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Read file
router.get('/:siteName/files/:fileName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Update file
router.post('/:siteName/files/:fileName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete file
router.delete('/:siteName/files/:fileName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename file
router.post('/:siteName/files/:fileName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})


module.exports = router;