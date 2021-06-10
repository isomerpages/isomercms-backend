function getPageContent(frontMatter, pageContent) {
  return ["---\n", yaml.stringify(frontMatter), "---\n", pageContent].join("")
}

function readPageContent(content) {
  const [unused, frontMatterString, pageContent] = content.split('---\n')
  return {
    frontMatter: yaml.parse(frontMatterString),
    pageContent
  }
}

const create = async (siteName, accessToken, path, frontMatter, pageContent) => {
  const params = {
    message: `Create _${collectionName}/${path}`,
    content: getPageContent(frontMatter, pageContent)
  }
  const resp = await ApiClient.put(
    `/${siteName}/contents/${path}`, 
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

const read = async (siteName, accessToken, path) => {
  const resp = await ApiClient.get(
    `/${siteName}/contents/${path}`, 
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  )
  return { 
    content: readPageContent(resp.data.content),
    sha: resp.data.sha,
  }
}

const update = (siteName, accessToken, sha, path, newFrontMatter, newPageContent) => {
  const { content: {content: pageContent, frontMatter } } = await read(siteName, accessToken, path)

  const updatedFrontMatter = newFrontMatter || frontMatter
  const updatedPageContent = newPageContent || pageContent

  const params = {
    message: `Updated _${collectionName}/${path}`,
    content: getPageContent(updatedFrontMatter, updatedPageContent),
    sha,
  }
  const resp = await ApiClient.put(
    `/${siteName}/contents/${path}`, 
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

const remove = (siteName, accessToken, sha, path) => {
  const params = {
    message: `Delete _${collectionName}/${path}`,
    sha,
  }
  const resp = await ApiClient.delete(
    `/${siteName}/contents/${path}`, 
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

export const PageService = {
  create,
  read,
  update,
  remove,
}