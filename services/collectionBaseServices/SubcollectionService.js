
const create = (siteName, accessToken, collectionName, subcollectionName) => {
  const params = {
    message: `Create _${collectionName}/${subcollectionName}`,
    content: '',
  }
  const resp = await ApiClient.put(
    `/${siteName}/contents/_${collectionName}/${subcollectionName}/.keep`, 
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

const remove = (siteName, accessToken, collectionName, subcollectionName) => {
  const params = {
    message: `Delete _${collectionName}/${subcollectionName}`,
  }
  const resp = await ApiClient.delete(
    `/${siteName}/contents/_${collectionName}/${subcollectionName}`, 
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

export const SubcollectionService = {
  create,
  // read,
  // update,
  remove,
}