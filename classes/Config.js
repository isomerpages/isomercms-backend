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

  async create(configName) {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`
    	// TO-DO
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

  async delete(configName) {
    try {
    	const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`
    	// TO-DO
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