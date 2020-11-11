// Imports
const express = require('express')
const jwtUtils = require('../utils/jwt-utils')

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
        const { access_token } = jwtUtils.verifyToken(isomercms)
        req.accessToken = access_token
    } catch (err) {
        console.error('Authentication error')
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

// Login and logout
auth.get('/auth', noVerify)
auth.get('/auth/logout', noVerify)

// Index
auth.get('/', noVerify)

// Homepage
auth.get('/sites/:siteName/homepage', verifyJwt)
auth.post('/sites/:siteName/homepage', verifyJwt)

// Collection pages
auth.get('/sites/:siteName/collections/:collectionName', verifyJwt)
auth.get('/sites/:siteName/collections/:collectionName/pages', verifyJwt)
auth.post('/sites/:siteName/collections/:collectionName/pages', verifyJwt)
auth.get('/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.delete('/sites/:siteName/collections/:collectionName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName', verifyJwt)

// Collections
auth.get('/sites/:siteName/collections', verifyJwt)
auth.post('/sites/:siteName/collections', verifyJwt)
auth.delete('/sites/:siteName/collections/:collectionName', verifyJwt)
auth.post('/sites/:siteName/collections/:collectionName/rename/:newCollectionName', verifyJwt)

// Documents
auth.get('/sites/:siteName/documents', verifyJwt)
auth.post('/sites/:siteName/documents', verifyJwt)
auth.get('/sites/:siteName/documents/:documentName', verifyJwt)
auth.post('/sites/:siteName/documents/:documentName', verifyJwt)
auth.delete('/sites/:siteName/documents/:documentName', verifyJwt)
auth.post('/sites/:siteName/documents/:documentName/rename/:newDocumentName', verifyJwt)

// Images
auth.get('/sites/:siteName/images', verifyJwt)
auth.post('/sites/:siteName/images', verifyJwt)
auth.get('/sites/:siteName/images/:imageName', verifyJwt)
auth.post('/sites/:siteName/images/:imageName', verifyJwt)
auth.delete('/sites/:siteName/images/:imageName', verifyJwt)
auth.post('/sites/:siteName/images/:imageName/rename/:newImageName', verifyJwt)

// Menu directory
auth.get('/sites/:siteName/tree', verifyJwt)

// Menu
auth.get('/sites/:siteName/menus', verifyJwt)
auth.get('/sites/:siteName/menus/:menuName', verifyJwt)
auth.post('/sites/:siteName/menus/:menuName', verifyJwt)

// Pages
auth.get('/sites/:siteName/pages', verifyJwt)
auth.get('/sites/:siteName/unlinkedPages', verifyJwt)
auth.post('/sites/:siteName/pages', verifyJwt)
auth.get('/sites/:siteName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/pages/:pageName', verifyJwt)
auth.delete('/sites/:siteName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/pages/:pageName/rename/:newPageName', verifyJwt)

// Resource pages
auth.get('/sites/:siteName/resources/:resourceName', verifyJwt)
auth.post('/sites/:siteName/resources/:resourceName/pages', verifyJwt)
auth.get('/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.delete('/sites/:siteName/resources/:resourceName/pages/:pageName', verifyJwt)
auth.post('/sites/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName', verifyJwt)

// Resource room
auth.get('/sites/:siteName/resource-room', verifyJwt)
auth.post('/sites/:siteName/resource-room', verifyJwt)
auth.post('/sites/:siteName/resource-room/:resourceRoom', verifyJwt)
auth.delete('/sites/:siteName/resource-room', verifyJwt)

// Resources
auth.get('/sites/:siteName/resources', verifyJwt)
auth.post('/sites/:siteName/resources', verifyJwt)
auth.delete('/sites/:siteName/resources/:resourceName', verifyJwt)
auth.post('/sites/:siteName/resources/:resourceName/rename/:newResourceName', verifyJwt)

// Settings
auth.get('/sites/:siteName/settings', verifyJwt)
auth.post('/sites/:siteName/settings', verifyJwt)

// Sites
auth.get('/sites', verifyJwt)

auth.use((req, res, next) => {
    if (!req.route) {
        return res.status(404).send('Unauthorised for unknown route')
    }
    return next()
})

module.exports = {
    auth,
}