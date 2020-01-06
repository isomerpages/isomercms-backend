const Bluebird = require('bluebird')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')
const axios = require('axios')



// Import classes and util functions
const { File, DataType, PageType } = require('./File')
const { ResourceRoom } = require('./ResourceRoom')
const { Collection } = require('./Collection')
const { pageAggregator } = require('../utils/menu-utils')
const { deslugifyCollectionName } = require('../utils/utils')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

// Tree can have two methods: get linked, and get unlinked pages
class Tree {
	constructor(accessToken, siteName) {
	  this.accessToken = accessToken
	  this.siteName = siteName
	  this.tree = []
	  this.currentCommitSha = ''
	  this.navHasSimplePage = false
	  this.navHasResources = false
	  this.collections = []
	  this.directory = []
	//   this.unlinkedPages = []
	//   this.unlinked = []
	}

	// retrieve the tree item
	async getTree() {
		try {
			// Get the commits of the repo
			const { data: commits } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/commits`, {
				params: {
				ref: BRANCH_REF,
				},
				headers: {
					Authorization: `token ${this.accessToken}`,
					"Content-Type": "application/json"
				},
			});
			// Get the tree sha of the latest commit
			const { commit: { tree: { sha: treeSha } } } = commits[0];
			this.currentCommitSha = commits[0].sha;
		
			const { data: { tree: gitTree } } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/trees/${treeSha}?recursive=1`, {
				params: {
					ref: BRANCH_REF,
				},
				headers: {
					Authorization: `token ${this.accessToken}`,
					"Content-Type": "application/json"
				},
			});
	
			this.tree = gitTree;
		} catch (err) {
			console.log(err);
		}
	}

	// send the new tree object back to Github and point the latest commit on the staging branch to it
	async sendTree(tree, currentCommitSha) {
		const resp = await axios.post(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/trees`, {
				tree,
			}, {
			headers: {
				Authorization: `token ${this.accessToken}`,
				"Content-Type": "application/json"
			},
		});
	
		const { data: { sha: newTreeSha } } = resp;
	
		const baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/refs`;
		const baseCommitEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/commits`;
		const refEndpoint = `${baseRefEndpoint}/heads/${BRANCH_REF}`;
	
		const newCommitResp = await axios.post(baseCommitEndpoint, {
			message: 'Rename resource page files to {date}-{category}-{title} format',
			tree: newTreeSha,
			parents: [currentCommitSha],
		}, {
			headers: {
				Authorization: `token ${this.accessToken}`,
				"Content-Type": "application/json"
			},
		});
	
		const newCommitSha = newCommitResp.data.sha;
	
		/**
		 * The selected branch reference will now point
		 * to `newCommitSha` instead of `currentCommitSha`
		 */
		await axios.patch(refEndpoint, {
			sha: newCommitSha,
			force: true,
		}, {
			headers: {
				Authorization: `token ${this.accessToken}`,
				"Content-Type": "application/json"
			},
		});
	}

	getCollectionsFromTree() {

	}

	async getLinkedPages() {
	    try {
	        // Obtain items in the navigation bar
	        const IsomerNavFile = new File(this.accessToken, this.siteName)
	        IsomerNavFile.setFileType(new DataType())
	        const { content } = await IsomerNavFile.read('navigation.yml')
	        const navItems = yaml.safeLoad(base64.decode(content)).links;

	        /**
	         * The following function tokenizes the items 
	         * loaded from `navigation.yml` into these types:
	         * `page` - Simple pages
	         * `collection` - Collection pages
	         * `resource room` - Resource room pages
	         */

	        const directoryCollections = navItems.map(item => {
				// first check if there are sublinks. if sublinks exist, then it's a false collection
				if (item.sublinks) {
	                return {
	                    type: 'falseCollection',
	                    title: item.title,
	                    children: item.sublinks.map((item) => (Object.assign(item, { type: 'page' }))),
	                }
	            } else if (item.collection) {
	                this.collections.push(item.collection)
	                return {
	                    type: 'collection',
	                    title: item.title,
	                    collection: item.collection,
	                }
	            } else if (item.resource_room) {
	                this.navHasResources = true
	                return {
	                    type: 'resource room',
	                    title: item.title,
					}
				// If navigation item does not have a sublinks attribute but has a url attribute, then
				// it links to a simple page / external page
	            // TODO - know if it links to an external page
	            } else if (item.url) {
	                this.navHasSimplePage = true;
	                const fileName = item.title.toLowerCase().replace(" ", "-") + ".md"
	                return {
	                    type: 'page',
	                    title: item.title,
	                    path: encodeURIComponent(`${new PageType().getFolderName()}/${fileName}`),
	                    // url: item.url,
	                }
	            }
	            return item
	        });

	        /**
	         * We loop through the directoryCollections item
	         * to find items of type `collection`, and retrieve the 
	         * relevant `collection-page`(s) & groups them up into
	         * `thirdnav` groups when necessary
	         */

			// THIS IS WHERE WE USE GIT TREE TO GET THE PAGE DATA
			
			// Here, we are trying to get rid of the previous method of retrieving
			// directory data and replace it with the git tree method, but it might
			// not be possible
			if (this.tree) {
				this.directory = await Bluebird.map(directoryCollections, async (item) => {
					return pageAggregator(item, this.accessToken, this.siteName)
				})
			} else {
				throw new Error('You need to retrieve the Git tree before you can perform this operation!')
			}
	    } catch (err) {
	      throw err
	    }
	}

	// async getUnlinkedPages() {
	//     // Get all files in pages folder in the repo
	//     const IsomerPageFile = new File(this.accessToken, this.siteName)
	//     IsomerPageFile.setFileType(new PageType())
	//     const pages = await IsomerPageFile.list()

	  
	//     // Check if there are any simple pages linked in the navigation bar
	//     if (this.navHasSimplePage) {
	//         // Get the list of pages which are not linked in the navigation bar
	//         const linkedPages = this.directory
	//                             .filter(item => item.type === 'page')
	//                             .map(item => ({
	//                                 path: item.path,
	//                                 fileName: item.path.split('%2F')[1],
	//                             }))
	//         this.unlinkedPages = _.differenceBy(pages, linkedPages, 'fileName')
	//     } else {
	//         this.unlinkedPages = pages
	//     }

	//     const unlinkedArr = [{
	//         type: 'collection',
	//         title: 'Unlinked Pages',
	//         collectionPages: this.unlinkedPages,
	//       }]

	//     // Check if resources are linked in the navigation bar
	//     // If they are not linked, include resources in the unlinked section
	//     if (!this.navHasResources) {
	//         const resourceRoomName = await new ResourceRoom(this.accessToken, this.siteName).get()
	//         unlinkedArr.push({
	//             type: 'resource room',
	//             title: deslugifyCollectionName(resourceRoomName),
	//         })
	//     }

	//     // Get the list of collections which are not linked in the navigation bar
	//     const repoCollections = await new Collection(this.accessToken, this.siteName).list()
	//     const unlinkedCollections = _.differenceBy(repoCollections, this.collections)

	//     // If there are any unlinked collections, generate a similar data structure
	//     // as this.directory
	//     if (unlinkedCollections.length > 0) {
	//         // Create an array of collection items to mimic directoryCollections above
	//         const unlinkedCollectionsToAdd = unlinkedCollections.map((collection) => ({
	//             type: 'collection',
	//             title: deslugifyCollectionName(collection), // Convert collection name into title
	//             collection,
	//         }))
			
	//         // Add these collections to the array of unlinked objects
	//         unlinkedArr.push(...unlinkedCollectionsToAdd)
	//     }

	//     // run the unlinked array through the same process as we did with directory
	//     this.unlinked = await Bluebird.map(unlinkedArr, async (item) => {
	//         return pageAggregator(item, this.accessToken, this.siteName)
	//     })
	// }
}

module.exports = { Tree }