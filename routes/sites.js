const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')
const Bluebird = require('bluebird')

const ISOMER_GITHUB_ORG_NAME = 'isomerpages'
// const ISOMER_ADMIN_REPOS = [
//   'isomercms-backend',
//   'isomercms-frontend',
//   'isomer-redirection',
//   'isomerpages-template',
//   'isomer-conversion-scripts',
//   'isomer-wysiwyg',
//   'isomer-slackbot',
//   'isomer-tooling',
//   'generate-site',
//   'travisci-scripts',
//   'recommender-train',
//   'editor',
//   'ci-test',
//   'infra',
//   'markdown-helper',
// ]

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

// timeDiff tells us when a repo was last updated in terms of days (for e.g. 2 days ago,
// today)
const timeDiff = (lastUpdated) => {
  const gapInUpdate =  new Date().getTime() - new Date(lastUpdated).getTime()
  const numDaysAgo = Math.floor(gapInUpdate/(1000 * 60 * 60 * 24))
  // return a message for number of days ago repo was last updated
  switch (numDaysAgo) {
    case 0:
      return 'Updated today';
    case 1: 
      return 'Updated 1 day ago';
    default:
      return `Updated ${numDaysAgo} days ago` 
  }
}

/* Returns a list of all sites (repos) that the user has access to on Isomer. */
// TO-DO: Paginate properly
router.get('/', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    // Variable to store user repos
    let siteNames = []

    // Variables to track pagination of user's repos in case user has more than 100
    let pageCount = 1
    let hasNextPage = true;
    const filePath = `https://api.github.com/user/repos?per_page=100&page=`;

    // Loop through all user repos
    while (hasNextPage) {
      const resp = await axios.get(filePath + pageCount, {
        headers: {
          Authorization: `token ${access_token}`,
          "Content-Type": "application/json"
        }
      })

      // Filter for isomer repos
      const isomerRepos = resp.data.reduce((acc, repo) => {
        const { updated_at, full_name } = repo
        const fullName = full_name.split('/')
        if (fullName[0] === ISOMER_GITHUB_ORG_NAME) {
          return acc.concat({
            repoName: fullName[1],
            lastUpdated: timeDiff(updated_at),
          })
        }
        return acc
      }, [])


      siteNames= siteNames.concat(isomerRepos)
      hasNextPage = resp.headers.link.includes('next')
      ++pageCount
    }
    
    // Remove Isomer admin repositories from this list
    // siteNames = _.difference(siteNames, ISOMER_ADMIN_REPOS)
    
    res.status(200).json({ siteNames })
  } catch (err) {
    console.log(err)
  }
});

module.exports = router;