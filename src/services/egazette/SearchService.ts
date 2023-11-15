import algoliasearch, { SearchClient, SearchIndex } from "algoliasearch"

import logger from "@root/logger/logger"
// TODO: Update import
import { SearchRecord } from "@root/routes/formsg/formsgEGazette"

class SearchService {
  private searchClient: SearchClient

  private searchIndex: SearchIndex

  constructor(client: SearchClient) {
    this.searchClient = client
    this.searchIndex = this.searchClient.initIndex("ogp-egazettes")
    this.setUpIndex()
  }

  private setUpIndex = async () => {
    try {
      await this.searchIndex.setSettings({
        // NOTE: This is in order of priority
        searchableAttributes: [
          "title",
          "category",
          "subCategory",
          "publishDate,notificationNum",
          "fileUrl",
        ],
        customRanking: ["desc(publishTimestamp)"],
      })
    } catch (e) {
      logger.error(
        `Error while setting search index settings: ${JSON.stringify(e)}`
      )
    }
  }

  searchGazettes = async (query: string) => {
    logger.info("Search for gazettes")
    try {
      const hits = await this.searchIndex.search(query)
      logger.info(`Received hits`)
      logger.info(hits)
    } catch (e) {
      logger.error(`Error while searching: ${JSON.stringify(e)}`)
    }
  }

  addToIndex = async (record: SearchRecord) => {
    try {
      await this.searchIndex.saveObject(record)
    } catch (e) {
      logger.error(`Error while adding to index: ${JSON.stringify(e)}`)
    }
  }
}

export default SearchService
