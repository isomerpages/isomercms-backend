import Papa from "papaparse"

export default function promisifyPapaParse<T>(content: string) {
  return new Promise<T>((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      complete(results) {
        // validate the csv
        if (!results.data) {
          reject(new Error("Failed to parse csv"))
        }
        resolve(results.data as T)
      },
      error(error: unknown) {
        reject(error)
      },
    })
  })
}
