const { NotFoundError } = require("@errors/NotFoundError")

const GitHubService = require('../db/GitHubService')

const Read = async ({ path }, { accessToken }) => {
    let resp 
    try {
        resp = await GitHubService.Read({ accessToken, url: path })
    } catch (err) {
        // do nothing
    }

    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content, sha } = resp.data
    const decodedContent = Base64.decode(content)

    return { content: decodedContent, sha }
}

module.exports = {
    Read,
}