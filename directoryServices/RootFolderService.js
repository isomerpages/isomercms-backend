const BaseDirectoryService = require('./BaseDirectoryService')

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]
const ISOMER_TEMPLATE_PROTECTED_DIRS = [
  "data",
  "includes",
  "site",
  "layouts",
  "files",
  "images",
  "misc",
  "pages",
]


const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const List = async (reqDetails) => {
    const path = genGhContentUrl(reqDetails.siteName, '')
    const { data } = await BaseDirectoryService.List({ path }, reqDetails)
    const filesOrDirs = data.map((fileOrDir) => {
        const { name, path, sha, size, content, type } = fileOrDir
        return {
          name,
          path,
          sha,
          size,
          content,
          type,
        }
    })

    return { data: filesOrDirs.reduce((acc, curr) => {
        if (
          curr.type === "dir" &&
          !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
          curr.name.slice(0, 1) === "_"
        )
          acc.push(curr.path.slice(1))
        return acc
    }, [])
    }
    
}

module.exports = {
    List,
}