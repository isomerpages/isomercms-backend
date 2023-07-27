import axios from "axios"
import { JSDOM } from "jsdom"
import { ResultAsync, okAsync, errAsync } from "neverthrow"

import PreviewParsingError from "@errors/PreviewParsingError"

import { PreviewInfo } from "@root/types/previewInfo"

export default class PreviewService {
  getImageUrl = (siteUrl: string): ResultAsync<string, PreviewParsingError> =>
    ResultAsync.fromPromise(
      axios.get<string>(siteUrl),
      () => new PreviewParsingError(siteUrl)
    ).andThen((documentResponse) => {
      const { window } = new JSDOM(documentResponse.data)
      const faviconLink = window.document
        .querySelector('[rel="shortcut icon"]')
        ?.getAttribute("href")
      if (faviconLink) {
        // There is an option to verify that the image link is valid by
        // making a GET request and ensuring status code is 2XX. The
        // decision is to not include it so that we feedback to CMS users
        // that their favicon is malfunctioning as well as not incur
        // additional latency.
        return okAsync(siteUrl.concat(faviconLink))
      }
      return errAsync(new PreviewParsingError(siteUrl))
    })

  getPreviewInfo = (siteUrl: string): Promise<PreviewInfo> =>
    this.getImageUrl(siteUrl).match<PreviewInfo>(
      (imageUrl) => ({ imageUrl }),
      (_error) => ({ imageUrl: undefined })
    )
}
