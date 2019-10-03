const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    const accessToken = req.query.access_token

    const filePath = `https://api.github.com/repos/isomerpages/travis-test/contents/index.md`
    const resp = await axios.get(filePath, {
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json"
      }
    })
  
    const contentBase64 = resp.data.content
    const sha = resp.data.sha
    const contentString = base64.decode(contentBase64)
  
    // Obtain content from a page on GitHub
    res.render('edit', { 
      access_token: accessToken,
      content: contentString,
      sha: sha
     });
  } catch (err) {
    console.log(err)
  }
});

module.exports = router;
