const axios = require('axios');

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async read() {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

			const params = {
        validateStatus: validateStatus,
        "ref": BRANCH_REF,
			}
			
	    const resp = await axios.get(endpoint, {
				params,
	      headers: {
	        Authorization: `token ${this.accessToken}`,
	        "Content-Type": "application/json"
	      }
	    })

	    if (resp.status === 404) throw new Error ('Page does not exist')

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