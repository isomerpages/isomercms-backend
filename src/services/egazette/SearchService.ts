import algoliasearch, { SearchClient } from "algoliasearch"

import logger from "@root/logger/logger"

class SearchService {
  private searchClient: SearchClient

  constructor(client: SearchClient) {
    this.searchClient = client
  }

  searchGazettes = async () => {
    logger.info("Search for gazettes")
  }
}

export default SearchService
