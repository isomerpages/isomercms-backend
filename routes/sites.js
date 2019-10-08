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
        return { name: site.name, link: `${FRONTEND_URL}/sites/${site.name}` }
      } else {
        return undefined
      }
    }))

    // Obtain content from a page on GitHub
    res.render('sites', { 
      siteNames
     });
  } catch (err) {
    console.log(err)
  }
});


/* GET root folder of site. */
router.get('/:site', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { site } = req.params

    const folderPath = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${site}/contents/`

    const resp = await axios.get(folderPath, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    const folderObjects = resp.data.map(object => {
      return { 
        link: object.type === 'file' ? 
          `${FRONTEND_URL}/sites/${site}/files/${object.path}` : 
          `${FRONTEND_URL}/sites/${site}/folders/${object.path}`, 
        fileName: object.path,
        isFile: object.type === 'file' 
      }
    })
  
    // Obtain content from a page on GitHub
    res.render('folder', { 
      objects: folderObjects,
      currentDir: '/',
      site: site
     });
  } catch (err) {
    console.log(err)
  }
});

// Get subfolder of site
router.get('/:site/folders/:folder*', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { site, folder } = req.params

    const folderPath = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${site}/contents/${folder}`

    const resp = await axios.get(folderPath, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    const folderObjects = resp.data.map(object => {
      return { 
        link: object.type === 'file' ? 
          `${FRONTEND_URL}/sites/${site}/files/${object.path}` : 
          `${FRONTEND_URL}/sites/${site}/folders/${object.path.replace(`${site}/`)}`, 
        fileName: object.path,
        isFile: object.type === 'file' 
      }
    })
  
    // Obtain content from a page on GitHub
    res.render('folder', { 
      objects: folderObjects,
      currentDir: '/',
      site: site
     });
  } catch (err) {
    console.log(err)
  }
});

// Get the content of a specified file
router.get('/:site/files/:file*', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { site, file } = req.params

    const filePath = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${site}/contents/${file}`

    const resp = await axios.get(filePath, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })
  
    const contentBase64 = resp.data.content
    const sha = resp.data.sha
    const content = base64.decode(contentBase64)
  
    // Obtain content from a page on GitHub
    res.render('edit', { 
      content: content,
      sha: sha
     });
  } catch (err) {
    console.log(err)
  }
});

// Update the content of a specified file
router.post('/:site/files/:file', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { site, file } = req.params
    const { sha, content } = req.body

    const filePath = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${site}/contents/${file}`
    let params = {
      "message": "Update file",
      "content": content,
      "branch": "staging",
      "sha": sha
    }

    await axios.put(filePath, params, {
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    res.status(200).send('OK')

  } catch (err) {
    console.log(err)
  }
});

module.exports = router;