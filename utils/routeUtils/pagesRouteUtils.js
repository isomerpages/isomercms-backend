// Import classes
const { File, PageType } = require('../../classes/File')


const readPageUtilFunc = async (accessToken, siteName, pageName) => {
    const IsomerFile = new File(accessToken, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const { sha, content } = await IsomerFile.read(pageName)
    return { sha, content }
}

module.exports = {
    readPageUtilFunc,
}