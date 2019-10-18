const yaml = require('js-yaml')
const base64 = require('base-64')

const { Config } = require('./Config.js')

class ResourceRoom {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

    	return contentObject.resources_name
    } catch (err) {
      throw err
    }
  }

  async createOrRename(resourceRoom) {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

      contentObject.resources_name = resourceRoom

    	const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

      return resourceRoom
    } catch (err) {
      throw err
    }
  }

  async delete() {
    try {
    	// Delete collection in config
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

    	delete contentObject.resources_name
    	const newContent = base64.encode(yaml.safeDump(contentObject))

    	await config.update(newContent, sha)

    } catch (err) {
      throw err
    }
  }
}

module.exports = { ResourceRoom }