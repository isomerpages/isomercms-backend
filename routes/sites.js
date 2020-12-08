const express = require('express');
const router = express.Router();
const axios = require('axios');
const Bluebird = require('bluebird');
const _ = require('lodash');
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler');
const { flatten } = require('lodash');

// Import error
const { NotFoundError } = require('../errors/NotFoundError')

const GH_MAX_REPO_COUNT = 100
const ISOMERPAGES_REPO_PAGE_COUNT = process.env.ISOMERPAGES_REPO_PAGE_COUNT || 3
const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const ISOMER_ADMIN_REPOS = [
  'isomercms-backend',
  'isomercms-frontend',
  'isomer-redirection',
  'isomerpages-template',
  'isomer-conversion-scripts',
  'isomer-wysiwyg',
  'isomer-slackbot',
  'isomer-tooling',
  'generate-site',
  'travisci-scripts',
  'recommender-train',
  'editor',
  'ci-test',
  'infra',
  'markdown-helper',
]

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
async function getSites (req, res, next) {
  const { accessToken } = req

  const endpoint = `https://api.github.com/orgs/${ISOMER_GITHUB_ORG_NAME}/repos`;

  const params = {
    per_page: GH_MAX_REPO_COUNT,
    sort: "full_name",
  }

  // Simultaneously retrieve all isomerpages repos
  const paramsArr = []
  for (i = 0; i < ISOMERPAGES_REPO_PAGE_COUNT; i++) {
    paramsArr.push({ ...params, page: i + 1 })
  }

  const sites = await Bluebird.map(paramsArr, async (params) => {
    const resp = await axios.get(endpoint, {
      params,
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      }
    })

    return resp.data
      .map((repoData) => {
        const {
          updated_at,
          permissions,
          name
        } = repoData

        return {
          lastUpdated: timeDiff(updated_at),
          permissions,
          repoName: name,
        }
      }).filter((repoData) => repoData.permissions.push === true && !ISOMER_ADMIN_REPOS.includes(repoData.repoName))
  })

  const flattenedSites = _.flatten(sites)

  res.status(200).json({ siteNames: flattenedSites })
}

/* Checks if a user has access to a repo. */
async function checkHasAccess (req, res, next) {
  try {
    const { accessToken, userId } = req
    const { siteName } = req.params
    
    const endpoint = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${siteName}/collaborators/${userId}`
    await axios.get(endpoint, {
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      }
    })

    res.status(200).json()
  } catch (err) {
    const status = err.response.status
    // If user is unauthorized or site does not exist, show the same NotFoundError
    if (status === 404 || status === 403) throw new NotFoundError('Site does not exist')
    console.log(err)
    throw err
  }
}

router.get('/', attachRouteHandlerWrapper(getSites));
router.get('/:siteName', attachRouteHandlerWrapper(checkHasAccess));

module.exports = router;
