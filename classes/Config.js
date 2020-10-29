const axios = require('axios');
const validateStatus = require('../utils/axios-utils')

// Import error
const { NotFoundError  } = require('../errors/NotFoundError')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async read() {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

		const params = {
			"ref": BRANCH_REF,
		}
			
	    const resp = await axios.get(endpoint, {
			validateStatus,
			params,
			headers: {
				Authorization: `token ${this.accessToken}`,
				"Content-Type": "application/json"
			}
	    })

	    if (resp.status === 404) throw new NotFoundError ('Config page does not exist')

	    const { content, sha } = resp.data

	    return { content, sha }

    } catch (err) {
      throw err
    }
  }

  async update(newContent, sha) {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

		const params = {
			"message": 'Edit config',
			"content": newContent,
			"branch": BRANCH_REF,
			"sha": sha
		}

	await axios.put(endpoint, params, {
			headers: {
			  Authorization: `token ${this.accessToken}`,
			  "Content-Type": "application/json"
			}
		})
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = { Config }