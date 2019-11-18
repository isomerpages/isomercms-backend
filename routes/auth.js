const express = require('express')
const router = express.Router()
const axios = require('axios')
const queryString = require('query-string')

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN
const AUTH_TOKEN_EXPIRY_MS = process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS.toString()
const FRONTEND_URL = process.env.FRONTEND_URL

const jwtUtils = require('../utils/jwt-utils')

router.get('/', async function (req, res, next) {
  try {
    const { code, state } = req.query

    const params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
      state: state,
    }

    const resp = await axios.post('https://github.com/login/oauth/access_token', params)

    const access_token = queryString.parse(resp.data).access_token
    if (!access_token) throw new Error('Access token not found')

    const authTokenExpiry = new Date()
    authTokenExpiry.setTime(authTokenExpiry.getTime() + AUTH_TOKEN_EXPIRY_MS)

    const cookieSettings = {
      path: '/',
      domain: COOKIE_DOMAIN,
      expires: authTokenExpiry,
      httpOnly: true,
      sameSite: true,
      secure: process.env.NODE_ENV !== 'DEV' && process.env.NODE_ENV !== 'LOCAL_DEV',
    }

    const token = jwtUtils.signToken({ access_token })

    res.cookie('oauthtoken', token, cookieSettings)

    res.redirect(`${FRONTEND_URL}/sites`)
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
