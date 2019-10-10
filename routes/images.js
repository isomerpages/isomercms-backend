const express = require('express');
const router = express.Router();
// const axios = require('axios');
// const base64 = require('base-64');
// const jwtUtils = require('../utils/jwt-utils')
// const _ = require('lodash')

// const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const FRONTEND_URL = process.env.FRONTEND_URL

// List images
router.get('/:siteName/images', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Create new images
router.post('/:siteName/images', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Read images
router.get('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Update images
router.post('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete images
router.delete('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename images
router.post('/:siteName/images/:imageName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;