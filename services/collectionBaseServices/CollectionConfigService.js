import { ApiClient } from '../api'
import yaml from 'yaml'
import _ from 'lodash'

function getCollectionConfigContent(collectionName, orderArray) {
  const contentObject = {
    collections: {
      [collectionName]: {
        output: true,
        order: orderArray || [],
      },
    }
  }
  return Base64.encode(yaml.stringify(contentObject))
}

function readCollectionConfigContent(content) {
  const contentObject = yaml.parse(Base64.decode(content))
  const collectionName = Object.keys(contentObject.collections)[0]
  const { order: orderArray } = contentObject.collections[collectionName]
  
  return { 
    collectionName,
    orderArray,
  }
}

function isSubcollectionLine(str) {
  return (newLine.includes("/")) 
}

const create = async (siteName, accessToken, collectionName, orderArray) => {
  const params = {
      message: `Create _${collectionName}/collection.yml`,
      content: getCollectionConfigContent(collectionName, orderArray),
  }
  const resp = await ApiClient.put(
    `/${siteName}/contents/_${collectionName}/collection.yml`, 
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

const read = async (siteName, accessToken, collectionName) => {
  const resp = await ApiClient.get(
    `/${siteName}/contents/_${collectionName}/collection.yml`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  )
  return {
    content: readCollectionConfigContent(resp.data.content),
    sha: resp.data.sha,
  }
}

const addNewLines = async (siteName, accessToken, sha, collectionName, newLines) => {
  const { content: { orderArray } } = await read(siteName, accessToken, collectionName)
  // let newOrderArray = orderArray.copy()
  const reducer = (orderArray, newLine) => {
    if (isSubcollectionLine(newLine)) {
      const [subcollectionName, fileName] = newLine.split('/')
      _.findLast(subcollectionName)
    }
  }
  
  const newOrderArray = newLines.reduce(reducer, orderArray)
  await update(siteName, accessToken, sha, collectionName, newOrderArray)
}

const update = async (siteName, accessToken, sha, collectionName, newOrderArray) => {
  const params = {
    message: `Update _${collectionName}/collection.yml`,
    content: getCollectionConfigObject(collectionName, newOrderArray),
    sha,
  }
  const resp = await ApiClient.put(
    `/${siteName}/contents/_${collectionName}/collection.yml`,
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

const remove = async (siteName, accessToken, sha, collectionName) => {
  const params = {
    message: `Delete _${collectionName}/collection.yml`,
    sha,
  }
  const resp = await ApiClient.delete(
    `/${siteName}/contents/_${collectionName}/collection.yml`,
    params,
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  )

  return {
    sha: resp.data.commit.sha,
  }
}


export const CollectionConfigService = {
  create,
  read,
  update,
  remove,
  addNewLines,
}
