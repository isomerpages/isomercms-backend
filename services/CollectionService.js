import { ApiClient } from '../api/apiClient'
import {
  CollectionConfigService,
  SubcollectionService,
  PageService,
} from './collectionBaseServices'

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]

function isCollectionFolderName(str) {
  return str.slice(0, 1) === "_" && !ISOMER_TEMPLATE_DIRS.includes(str)
}

const create = async (siteName, accessToken, collectionName, pagesArray) => { // create collection
  await CollectionConfigService.create(siteName, accessToken, collectionName, pagesArray)
  await Promise.all(pagesArray.forEach(page => {
    await MoverService.move(siteName, accessToken, page, `${collectionName}/${page}`)
  }))
}

const read = async (siteName, accessToken) => { // list all collections
  const resp = await ApiClient.get(
    `/${siteName}/contents/`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  )
  return resp.data.filter(elem => elem.type === 'dir' && isCollectionFolderName(elem.name)) 
}


const remove = (siteName, accessToken, collectionName) => {
  const params = {
    message: `Delete _${collectionName}`,
  }
  const resp = await ApiClient.delete(
    `/${siteName}/contents/_${collectionName}`, 
    params,
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  )
  return { 
    sha: resp.data.content.sha,
  }
}

const listCollection = async(siteName, accessToken, collectionName) => {
  const { content: collectionOrder } = await CollectionConfigService.read(siteName, accessToken, collectionName)
  return collectionOrder
}

const addCollectionPage = async (siteName, accessToken, collectionName, subcollectionName, pageName) => { 
  await PageService.create(siteName, accessToken, `${collectionName}/${subcollectionName ? `${subcollectionName}/${pageName}` : pageName}` )

}

const updateCollectionPage = async (siteName, accessToken, collectionName, subcollectionName) => {
}

const removeCollectionPage = async (siteName, accessToken, collectionName, subcollectionPath) => { 
}

const addSubCollection = async (siteName, accessToken, collectionName, subcollectionName, pagesArray) => {
  await CollectionConfigService.update(siteName, accessToken, collectionName, pagesArray)
  await Promise.all(pagesArray.forEach(page => {
    await MoverService.move(siteName, accessToken, page, `${collectionName}/${page}`)
  }))
}

const updateSubCollection = async (siteName, accessToken, collectionName, oldSubcollectionPath, newSubcollectionPath) => {
  // update collectionconfig
  // add & remove subcollection
  SubcollectionService.create()

}

const removeSubCollection = async (siteName, accessToken, collectionName, subcollectionPath) => {
  // update collectionconfig
  // add subcollection
}


export const CollectionService = {
  create,
  read,
  // update,
  remove,
  listCollection,
  addCollectionPage,
  updateCollectionPage,
  removeCollectionPage,
  addSubCollection,
  updateSubCollection,
  removeSubCollection,
}