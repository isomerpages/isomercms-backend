const { NotFoundError } = require("@errors/NotFoundError")

const GitHubService = require('../db/GitHubService')

const Read = async ({ path }, { accessToken }) => {
    const resp = await GitHubService.Read({ accessToken, url: path })
    
    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content, sha } = resp.data
    const decodedContent = Base64.decode(content)

    return { content: decodedContent, sha }
}

const Update = async ({ fileContent, path, sha }, { accessToken }) => {
    const base64Content = Base64.encode(fileContent)
    
    const resp = await GitHubService.Update({ accessToken, fileContent: base64Content, sha, url: path })

    const { data: { commit: { sha: newSha } } } = resp

    return { newSha }
}

module.exports = {
    Read,
    Update,
}