const yaml = require("yaml")

const BaseFileService = require('../BaseFileService')

const Read = async ({ path }, reqDetails) => {
    const { content, sha } = await BaseFileService.Read({ path }, reqDetails)

    // Ideally, this is where we read the yml file and return it as an object
    const parsedContent = yaml.parse(content)
    // const parsedContent = content // NOTE: we currently parse the YAML at the class level, so this needs to be turned on an off

    // for now
    return { content: parsedContent, sha }
}

const Update = async ({ fileContent, path, sha }, reqDetails) => {
    // Ideally, this is where we convert the yml object
    const stringifiedContent = yaml.stringify(fileContent)

    const { sha: newSha } = await BaseFileService.Update({ fileContent: stringifiedContent, path, sha }, reqDetails)

    // for now
    return { newSha:'test' }
}


module.exports = {
    Read,
    Update,
}