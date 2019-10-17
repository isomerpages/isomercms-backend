const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')
const Bluebird = require('bluebird')

const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
const FRONTEND_URL = process.env.FRONTEND_URL

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

/* Returns a list of all sites (repos) that the user has access to on Isomer. */
// TO-DO: Paginate properly
router.get('/', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    const filePath = `https://api.github.com/user/repos`
    const resp = await axios.get(filePath, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    // Ensures that only sites that are Isomer and have a staging branch are shown
    const siteNames = _.compact(await Bluebird.map(resp.data, async(site) => {
      // The full_name is in the format of <GITHUB_ORG_NAME>/<GITHUB_REPO_NAME>
      // isIsomerSite checks the <GITHUB_ORG_NAME> and makes sure that it matches the Isomer org name
      const isIsomerSite = site.full_name.split('/')[0] === ISOMER_GITHUB_ORG_NAME
      const branchEndpoint = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${site.name}/branches/staging`
      const branchResp = await axios.get(branchEndpoint, {
        validateStatus: validateStatus,
        headers: {
          Authorization: `token ${access_token}`,
          "Content-Type": "application/json"
        }
      })
      const hasStagingBranch = (branchResp.status === 200)
      
      if (isIsomerSite && hasStagingBranch) {
        return site.name
      } else {
        return undefined
      }
    }))

    res.status(200).json({ siteNames })
  } catch (err) {
    console.log(err)
  }
});

module.exports = router;