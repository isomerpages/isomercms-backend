const express = require('express');
const router = express.Router();
const uuid = require('uuid/v4');

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

const CLIENT_ID = process.env.CLIENT_ID
const REDIRECT_URI = process.env.REDIRECT_URI

/* GET home page. */
function getCmsHomepage (req, res, next) {
  res.status(200).json({ 
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: uuid()
   })
}
router.get('/', attachRouteHandlerWrapper(getCmsHomepage));

module.exports = router;
