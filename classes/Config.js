const axios = require('axios');
const validateStatus = require('../utils/axios-utils')

// Import logger
const logger = require('../logger/logger');

// Import error
const { NotFoundError  } = require('../errors/NotFoundError')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
	this.endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`
  }

  async read() {
    try {
    	const endpoint = `${this.endpoint}`

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
	const endpoint = `${this.endpoint}`

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
  }
}

class CollectionConfig extends Config {
	constructor(accessToken, siteName, collectionName) {
		super(accessToken, siteName)
		this.collectionName = collectionName
		this.endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_${collectionName}/collection.yml`
	}

	async create(content) {
      try {
        const endpoint = `${this.endpoint}`

		const params = {
		  "message": `Create file: _${this.collectionName}/collection.yml`,
		  "content": content,
		  "branch": BRANCH_REF,	
		}
		
		const resp = await axios.put(endpoint, params, {
	      headers: {
		    Authorization: `token ${this.accessToken}`,
			"Content-Type": "application/json"
		  }
		})
	
		return { sha: resp.data.content.sha }
	  } catch (err) {
        const status = err.response.status
        if (status === 422 || status === 409) throw new ConflictError(inputNameConflictErrorMsg(fileName))
        throw err.response
      }
    }
	

    async delete (sha) {
      try {
        const endpoint = `${this.endpoint}`
        
        const params = {
          "message": `Delete file: _${this.collectionName}/collection.yml`,
          "branch": BRANCH_REF,
          "sha": sha
        }
    
        await axios.delete(endpoint, {
          params,
          headers: {
            Authorization: `token ${this.accessToken}`,
            "Content-Type": "application/json"
          }
        })
      } catch (err) {
        const status = err.response.status
        if (status === 404) throw new NotFoundError ('File does not exist')
        throw err
      }
    }
}



module.exports = { Config, CollectionConfig }