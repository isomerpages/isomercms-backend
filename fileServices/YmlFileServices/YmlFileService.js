const BaseFileService = require('../BaseFileService')

const Read = async ({ path }, reqDetails) => {
    const { content, sha } = await BaseFileService.Read({ path }, reqDetails)

    // Ideally, this is where we read the yml file and return it as an object

    // for now
    return { content, sha }
}

module.exports = {
    Read,
}