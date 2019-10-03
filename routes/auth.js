const express = require('express');
const router = express.Router();
const axios = require('axios');
const queryString = require('query-string');

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    const { code, state } = req.query

    console.log(code, state, "CODE STATE")
  
    const params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
      state: state
    }
  
    const resp = await axios.post('https://github.com/login/oauth/access_token', params)

    const access_token = queryString.parse(resp.data).access_token
    res.redirect(`/edit?access_token=${access_token}`)
  } catch(err) {
    console.log(err)
  }
});

module.exports = router;
