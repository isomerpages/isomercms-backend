/** 
 * A function to deslugify a collection page's file name, taken from isomercms-frontend src/utils
*/
function deslugifyCollectionPage(collectionPageName) {
  // split the collection page name 
  const pageName = collectionPageName
                    .split('.')[0] // remove the file extension
                    .split('-')

  // unlinked pages are special collections where, the file name doesn't start with a number
  // if the first character of the first element in pageName is not a number, then it is an
  // unlinked page
  return (
    isNaN(pageName[0][0])
    ? 
    pageName
      .map((string) => string.charAt(0).toUpperCase() + string.slice(1)) // capitalize first letter
      .join(' ') // join it back together
    :
    pageName
      .slice(1)
      .map((string) => string.charAt(0).toUpperCase() + string.slice(1)) // capitalize first letter
      .join(' ') // join it back together
  )
}

/** 
 * A function to deslugify a collection's name
*/
function deslugifyCollectionName(collectionName) {
  return collectionName
    .split('-')
    .map((string) => string.charAt(0).toUpperCase() + string.slice(1)) // capitalize first letter
    .join(' '); // join it back together
}

module.exports = {
  deslugifyCollectionPage,
  deslugifyCollectionName,
}
