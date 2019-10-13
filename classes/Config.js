const axios = require('axios');
const _ = require('lodash')
const Bluebird = require('bluebird')
const yaml = require('js-yaml');
const base64 = require('base-64');

const GITHUB_ORG_NAME = 'isomerpages'

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.configType = ''
  }

  setConfigType(configType) {
    this.configType = configType.getName()
  }

  async add(configName) {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

	    const resp = await axios.get(endpoint, {
	      validateStatus: validateStatus,
	      headers: {
	        Authorization: `token ${this.accessToken}`,
	        "Content-Type": "application/json"
	      }
	    })

	    if (resp.status === 404) throw new Error ('Page does not exist')

	    const { content, sha } = resp.data
	    const config = yaml.safeLoad(base64.decode(content))

	    config[`${this.configType}`][`${configName}`] = { output: true }

	    const newContent = yaml.safeDump(base64.encode(config))

		let params = {
			"message": `Add ${this.configType}: ${configName}`,
			"content": newContent,
			"branch": "staging",
			"sha": sha
		}

		await axios.put(endpoint, params, {
			headers: {
			  Authorization: `token ${this.accessToken}`,
			  "Content-Type": "application/json"
			}
		})

    } catch (err) {
      throw err
    }
  }

  async read() {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

	    const resp = await axios.get(endpoint, {
	      validateStatus: validateStatus,
	      headers: {
	        Authorization: `token ${this.accessToken}`,
	        "Content-Type": "application/json"
	      }
	    })

	    if (resp.status === 404) throw new Error ('Page does not exist')

	    const { content, sha } = resp.data
	    const config = yaml.safeLoad(base64.decode(content))

	    return Object.keys(config[`${this.configType}`])
    } catch (err) {
      throw err
    }
  }

  async remove(configName) {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`

	    const resp = await axios.get(endpoint, {
	      validateStatus: validateStatus,
	      headers: {
	        Authorization: `token ${this.accessToken}`,
	        "Content-Type": "application/json"
	      }
	    })

	    if (resp.status === 404) throw new Error ('Page does not exist')

	    const { content, sha } = resp.data
	    const config = yaml.safeLoad(base64.decode(content))

	    delete config[`${this.configType}`][`${configName}`]

	    const newContent = yaml.safeDump(base64.encode(config))

		let params = {
			"message": `Add ${this.configType}: ${configName}`,
			"content": newContent,
			"branch": "staging",
			"sha": sha
		}

		await axios.put(endpoint, params, {
			headers: {
			  Authorization: `token ${this.accessToken}`,
			  "Content-Type": "application/json"
			}
		})
    } catch (err) {
      throw err
    }
  }
}

class CollectionType {
  constructor() {
    this.name = 'collections'
  }
  getName() {
    return this.name
  }
}


module.exports = { Config, CollectionType }