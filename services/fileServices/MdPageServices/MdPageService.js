const BaseFileService = require("../BaseFileService")

const Read = async ({ path }, reqDetails) => {
  const { content, sha } = await BaseFileService.Read({ path }, reqDetails)

  // Ideally, this is where we split the front matter and the main markdown content
  // so that our frontend doesn't need to handle it

  // for now
  return { content, sha }
}

const Update = async ({ fileContent, path, sha }, reqDetails) => {
  // Ideally, this is where we combine the front matter and the main markdown content
  // before we send it to GitHub, so that our frontend doesn't need to handle it

  const { sha: newSha } = await BaseFileService.Update(
    { fileContent, path, sha },
    reqDetails
  )

  // for now
  return { newSha }
}

module.exports = {
  Read,
  Update,
}
