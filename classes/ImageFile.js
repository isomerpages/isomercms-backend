const axios = require('axios');
const _ = require('lodash');
const { ImageType } = require('./File');

const GITHUB_ORG_NAME = 'isomerpages'


// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

class ImageFile {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
    this.blobEndpoint = null
    this.fileType = null
  }

  setFileTypeToImage() {
    this.fileType = new ImageType()
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/${this.fileType.getFolderName()}`
    /**
     * These endpoints below belong to 
     * Github's Data API
     */
    this.baseBlobEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/blobs`
    this.baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/refs`
    this.baseCommitEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/commits`
    this.baseTreeEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/trees`
  }



  async list() {
    try {
      const endpoint = `${this.baseEndpoint}`

      const resp = await axios.get(endpoint, {
        validateStatus: validateStatus,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
  
      if (resp.status !== 200) return {}
  
      const files = resp.data.map(object => {
        const pathNameSplit = object.path.split("/")
        const fileName = pathNameSplit[pathNameSplit.length - 1]
        if (object.type === 'file') {
          return {
            path: encodeURIComponent(object.path),
            fileName,
            sha: object.sha
          }
        }
      })
  
      return _.compact(files)
    } catch (err) {
      throw err
    }
  }

  /**
   * `create()` works differently compared to its counterpat
   * in the `File` class. This is due to the size limit (1MB) imposed
   * on uploading files via the Contents API (Github's).
   * 
   * Github's solution was to use their Git Database API (https://developer.github.com/v3/git/)
   * So this function basically:
   * 1) Upload the file as a blob (binary large object) and get its SHA
   * 2) Finds the SHA of the current commit "staging" branch is pointing to
   * 3) Finds the SHA of the tree the current commit is pointing to
   * 4) Create a new tree that has an entry with `fileName` and its pointing to the blob's SHA
   * 5) Create a new commit that points to the new tree
   * 6) Update the staging branch reference to the new commit
   * 
   * ...Yeah it's long I know
   * @param {String} fileName
   * @param {String} content 
   */
  async create(fileName, content) {
    try {
      const blobEndpoint = `${this.baseBlobEndpoint}`
      const refEndpoint = `${this.baseRefEndpoint}/heads/staging`

      let params = {
        "content": content,
        "encoding": "base64",
      }

      const blobResp = await axios.post(blobEndpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      // SHA of newly created blob
      const blobSha = blobResp.data.sha

      const listOfCommitsResp = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/commits`)
      const latestCommit = listOfCommitsResp.data[0]

      const treeSha = latestCommit.commit.tree.sha

      // Create new tree with a file pointing to the created blob
      const newTreeResp = await axios.post(this.baseTreeEndpoint, {
        "base_tree" : treeSha,
        "tree" : [
          {
            path : `images/${fileName}`,
            mode : "100644",
            type : "blob",
            sha : blobSha
          }
        ]
      }, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      const newTreeSha = newTreeResp.data.sha

      /**
       * When creating a new commit, it needs to do 3 things:
       * 1) Point to the previous commit
       * 2) Point to a tree
       * 3) Have a message
       */
      const newCommitResp = await axios.post(this.baseCommitEndpoint, {
        message: `Add image: ${fileName}`,
        tree: newTreeSha,
        parents: [currentCommitSha]
      },{
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      const newCommitSha = newCommitResp.data.sha

      /**
       * The `staging` branch reference will now point
       * to `newCommitSha` instead of `currentCommitSha`
       */
      const newRefResp = await axios.patch(refEndpoint, {
        sha : newCommitSha
      }, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
     

    } catch (err) {
      throw err
    }
  }

  async read(fileName) {
    try {
      /**
       * Images that are bigger than 1 MB needs to be retrieved
       * via Github Blob API. The content can only be retrieved through
       * the `sha` of the file.
       * The code below takes the `fileName`,
       * lists all the files in the image directory
       * and filters it down to get the sha of the file
       */
      const images = await this.list()
      const imageSha = images.filter(image => image.fileName === fileName)[0].sha

      const blobEndpoint = `${this.baseBlobEndpoint}/${imageSha}`

      const resp = await axios.get(blobEndpoint, {
        validateStatus: validateStatus,
        headers: {
          Authorization: `token ${this.accessToken}`,
        }
      })
  
      if (resp.status === 404) throw new Error ('Page does not exist')
  
      const { content, sha } = resp.data
  
      return { content, sha }
    } catch (err) {
      throw err
    }
  }

  async update(fileName, content, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      let params = {
        "message": `Update file: ${fileName}`,
        "content": content,
        "branch": "staging",
        "sha": sha
      }
  
      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      return { newSha: resp.data.commit.sha }
    } catch (err) {
      throw err
    }
  }

  async delete (fileName, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      let params = {
        "message": `Delete file: ${fileName}`,
        "branch": "staging",
        "sha": sha
      }
  
      await axios.delete(endpoint, {
        data: params,
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

module.exports = { ImageFile }
