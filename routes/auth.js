const express = require('express');
const router = express.Router();
const axios = require('axios');
const validateStatus = require('../utils/axios-utils')
const queryString = require('query-string');

// Import error
const { AuthError } = require('../errors/AuthError')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
const AUTH_TOKEN_EXPIRY_MS = process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS.toString()
const FRONTEND_URL = process.env.FRONTEND_URL

const jwtUtils = require('../utils/jwt-utils')
const COOKIE_NAME = 'isomercms'

async function githubAuth (req, res, next) {
  const { code, state } = req.query

  const params = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    state: state
  }

  const resp = await axios.post('https://github.com/login/oauth/access_token', params)

  const access_token = queryString.parse(resp.data).access_token
  if (!access_token) throw new AuthError ('Access token not found')

  // Retrieve user information to put into access token
  const endpoint = `https://api.github.com/user`
  const userResp = await axios.get(endpoint, {
    validateStatus,
    params,
    headers: {
      Authorization: `token ${access_token}`,
      Accept: 'application/vnd.github.v3+json',
      "Content-Type": "application/json"
    }
  })

  let userId
  if (userResp.data) userId = userResp.data.login

  const authTokenExpiry = new Date()
  authTokenExpiry.setTime(authTokenExpiry.getTime() + AUTH_TOKEN_EXPIRY_MS)
  
  let cookieSettings = {
    path: '/',
    expires: authTokenExpiry,
    httpOnly: true,
    sameSite: true,
    secure: process.env.NODE_ENV !== 'DEV' && process.env.NODE_ENV !== 'LOCAL_DEV',
  }

  const token = jwtUtils.signToken({access_token, user_id: userId})

  res.cookie(COOKIE_NAME, token, cookieSettings)

  res.redirect(`${FRONTEND_URL}/auth#isomercms`)
}

async function logout(req, res) {
  let cookieSettings
    cookieSettings = {
      path: '/',
  }
  res.clearCookie(COOKIE_NAME, cookieSettings)
  res.sendStatus(200)
}

router.get('/', attachRouteHandlerWrapper(githubAuth));
router.get('/logout', attachRouteHandlerWrapper(logout));

module.exports = router;
