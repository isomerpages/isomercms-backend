// Imports
const jwt = require('jsonwebtoken')
const express = require('express')
const jwtUtils = require('../utils/jwt-utils')

// Import errors
const { AuthError } = require('../errors/AuthError')

// Instantiate router object
const auth = express.Router()

const verifyJwt = (req, res, next) => {
    try {
        const { oauthtoken } = req.cookies
        const { access_token } = jwtUtils.verifyToken(oauthtoken)
        req.accessToken = access_token
    } catch (err) {
        console.error('Authentication error')
        if (err.name === 'TokenExpiredError') {
            throw new AuthError('JWT token has expired')
        }
    }
    return next('router')
}

auth.use(verifyJwt)

module.exports = {
    auth,
}