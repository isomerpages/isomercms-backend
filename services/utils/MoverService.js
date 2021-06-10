class MoverService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async movePage(fileName, currDir, newDir) {
    try {
      // Find type of file
      let oldFileType
      if (currDir === '') {
        oldFileType = UnlinkedPage(this.accessToken, this.siteName)
      } else if (!currDir.includes('/')) {
        const [collectionName, thirdNavName] = currDir.split('/')
        oldFileType = ThirdNavPage(this.accessToken, this.siteName, collectionName, thirdNavName)
      } else {
        oldFileType = CollectionPage(this.accessToken, this.siteName, currDir)
      }

      // Get file details
      const fileDetails = oldFileType.get(fileName)
      // Extract only content
      const content = extractContent(fileDetails)

      oldFileType.delete(fileName)
      
      let newFileType
      if (newDir === '') {
        newFileType = UnlinkedPage(this.accessToken, this.siteName)
      } else if (!currDir.includes('/')) {
        const [collectionName, thirdNavName] = newDir.split('/')
        newFileType = ThirdNavPage(this.accessToken, this.siteName, collectionName, thirdNavName)
      } else {
        newFileType = CollectionPage(this.accessToken, this.siteName, newDir)
      }

      newFileType.create(fileName, content) // handling of specific details e.g. front matter, collection.yml handled by create service method of specific target file type
    } catch (err) {
      throw err
    }
  }
}

module.exports = { MoverService }