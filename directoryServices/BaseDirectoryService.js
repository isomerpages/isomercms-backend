const { NotFoundError } = require("@errors/NotFoundError")

const GitHubService = require('../db/GitHubService')

// Job is to deal with directory level operations to and from GitHub

const List = async ({ path }, { accessToken }) => {
    const resp = await GitHubService.Read({ accessToken, url: path })

    if (resp.status === 404) throw new NotFoundError("File does not exist")

    return { data: resp.data }
}

module.exports = {
    List,
}