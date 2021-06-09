const BaseFileService = require('../BaseFileService')

const Read = async ({ path }, reqDetails) => {
    const { content, sha } = await BaseFileService.Read({ path }, reqDetails)

    // Ideally, this is where we split the front matter and the markdown content
    // so that our frontend doesn't need to handle it

    // for now
    return { content, sha }
}

module.exports = {
    Read,
}