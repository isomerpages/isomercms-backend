// Imports
const express = require('express')
const jwtUtils = require('../utils/jwt-utils')

// Import logger
const logger = require('../logger/logger')

// Import errors
const { AuthError } = require('../errors/AuthError')
const { verify } = require('jsonwebtoken')

// Instantiate router object
const auth = express.Router()


function noVerify (req, res, next) {
    next('router')
}

const verifyJwt = (req, res, next) => {
    try {
        const { isomercms } = req.cookies
        const { access_token, user_id } = jwtUtils.verifyToken(isomercms)
        req.accessToken = access_token
        req.userId = user_id
    } catch (err) {
        logger.error('Authentication error')
        if (err.name === 'TokenExpiredError') {
            throw new AuthError('JWT token has expired')
        }
        if (err.name === 'JsonWebTokenError') {
            throw new AuthError(err.message)
        }
        throw new Error(err)
    }
    return next('router')
}

// Extracts access_token if any, else set access_token to null
const whoamiAuth = (req, res, next) => {
  let access_token
  try {
    const { isomercms } = req.cookies
    access_token = jwtUtils.verifyToken(isomercms).access_token
  } catch (err) {
    access_token = undefined
  } finally {
    req.accessToken = access_token
    return next('router')
  }
}

// Login and logout
auth.get('/v1/auth', noVerify)
auth.get('/v1/auth/logout', noVerify)
auth.get('/v1/auth/whoami', whoamiAuth)

// Index
auth.get('/v1', noVerify)

// Homepage
auth.get('/v1/sites/:siteName/homepage', verifyJwt)
auth.post('/v1/sites/:siteName/homepage', verifyJwt)

// Directory
auth.get('/v1/sites/:siteName/files/:path', verifyJwt)

// Folder pages
auth.get('/v1/sites/:siteName/folders/all', verifyJwt)
auth.delete('/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName', verifyJwt)
auth.post('/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName', verifyJwt)

// Collection pages
auth.get('/v1/sites/:siteName/collections/:collectionName', verifyJwt)
auth.get('/v1/sites/:siteName/collections/:collectionName/pages', verifyJwt)
auth.post('/v1/sites/:siteName/collections/:collectionName/pages', verifyJwt) // to remove
auth.post('/v1/sites/:siteName/collections/:collectionName/pages/new/:pageName', verifyJwt)
auth.get('/v1/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.delete('/v1/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName', verifyJwt)

// Collections
auth.get('/v1/sites/:siteName/collections', verifyJwt)
auth.post('/v1/sites/:siteName/collections', verifyJwt)
auth.delete('/v1/sites/:siteName/collections/:collectionName', verifyJwt)
auth.post('/v1/sites/:siteName/collections/:collectionName/rename/:newCollectionName', verifyJwt)
auth.post('/v1/sites/:siteName/collections/:collectionPath/move/:targetPath', verifyJwt)

// Documents
auth.get('/v1/sites/:siteName/documents', verifyJwt)
auth.post('/v1/sites/:siteName/documents', verifyJwt)
auth.get('/v1/sites/:siteName/documents/:documentName', verifyJwt)
auth.post('/v1/sites/:siteName/documents/:documentName', verifyJwt)
auth.delete('/v1/sites/:siteName/documents/:documentName', verifyJwt)
auth.post('/v1/sites/:siteName/documents/:documentName/rename/:newDocumentName', verifyJwt)

// Images
auth.get('/v1/sites/:siteName/images', verifyJwt)
auth.post('/v1/sites/:siteName/images', verifyJwt)
auth.get('/v1/sites/:siteName/images/:imageName', verifyJwt)
auth.post('/v1/sites/:siteName/images/:imageName', verifyJwt)
auth.delete('/v1/sites/:siteName/images/:imageName', verifyJwt)
auth.post('/v1/sites/:siteName/images/:imageName/rename/:newImageName', verifyJwt)

// Menu directory
auth.get('/v1/sites/:siteName/tree', verifyJwt)

// Menu
auth.get('/v1/sites/:siteName/menus', verifyJwt)
auth.get('/v1/sites/:siteName/menus/:menuName', verifyJwt)
auth.post('/v1/sites/:siteName/menus/:menuName', verifyJwt)

// Pages
auth.get('/v1/sites/:siteName/pages', verifyJwt)
auth.post('/v1/sites/:siteName/pages', verifyJwt) // to remove
auth.post('/v1/sites/:siteName/pages/new/:pageName', verifyJwt)
auth.get('/v1/sites/:siteName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/pages/:pageName', verifyJwt)
auth.delete('/v1/sites/:siteName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/pages/:pageName/rename/:newPageName', verifyJwt)
auth.post('/v1/sites/:siteName/pages/move/:newPagePath', verifyJwt)

// Resource pages
auth.get('/v1/sites/:siteName/resources/:resourceName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/pages', verifyJwt)
auth.get('/v1/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/pages/new/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.delete('/v1/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName', verifyJwt)

// Resource room
auth.get('/v1/sites/:siteName/resource-room', verifyJwt)
auth.post('/v1/sites/:siteName/resource-room', verifyJwt)
auth.post('/v1/sites/:siteName/resource-room/:resourceRoom', verifyJwt)
auth.delete('/v1/sites/:siteName/resource-room', verifyJwt)

// Resources
auth.get('/v1/sites/:siteName/resources', verifyJwt)
auth.post('/v1/sites/:siteName/resources', verifyJwt)
auth.delete('/v1/sites/:siteName/resources/:resourceName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/rename/:newResourceName', verifyJwt)
auth.post('/v1/sites/:siteName/resources/:resourceName/move/:newResourceName', verifyJwt)

// Settings
auth.get('/v1/sites/:siteName/settings', verifyJwt)
auth.post('/v1/sites/:siteName/settings', verifyJwt)

// Navigation
auth.get('/v1/sites/:siteName/navigation', verifyJwt)
auth.post('/v1/sites/:siteName/navigation', verifyJwt)

// Netlify toml
auth.get('/v1/sites/:siteName/netlify-toml', verifyJwt)

// Sites
auth.get('/v1/sites', verifyJwt)
auth.get('/v1/sites/:siteName', verifyJwt)
auth.get('/v1/sites/:siteName/lastUpdated', verifyJwt)
auth.get('/v1/sites/:siteName/stagingUrl', verifyJwt)

auth.use((req, res, next) => {
    if (!req.route) {
        return res.status(404).send('Unauthorised for unknown route')
    }
    return next()
})

module.exports = {
    auth,
}