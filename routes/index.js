const express = require('express');
const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID
const REDIRECT_URI = process.env.REDIRECT_URI

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { 
    title: 'IsomerCMS',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI
   });
});

module.exports = router;
