const express = require('express');
const router = express.Router();
// const axios = require('axios');
// const base64 = require('base-64');
// const jwtUtils = require('../utils/jwt-utils')
// const _ = require('lodash')

// const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const FRONTEND_URL = process.env.FRONTEND_URL

// List collections
router.get('/:siteName/collections', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Create new collection
router.post('/:siteName/collections', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// List pages in collection
router.get('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Delete collection
router.delete('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename collection
router.post('/:siteName/collections/:collectionName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Reorder collection
router.post('/:siteName/collections/:collectionName/reorder', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;