/** 
 * A function to deslugify a collection page's file name, taken from isomercms-frontend src/utils
*/
function deslugifyCollectionPage(collectionPageName) {
  return collectionPageName
    .split('.')[0] // remove the file extension
    .split('-').slice(1) // remove the number at the start
    .map((string) => string.charAt(0).toUpperCase() + string.slice(1)) // capitalize first letter
    .join(' '); // join it back together
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
