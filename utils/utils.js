const axios = require('axios');
const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME

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

// retrieve the tree item
async function getRootTree(repo, accessToken, branchRef='staging') {
  try {
    const headers = {
      Authorization: `token ${accessToken}`,
      Accept: 'application/json',
    };
    // Get the commits of the repo
    const { data: commits } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/commits`, {
      params: {
        ref: branchRef,
      },
      headers,
    });
    // Get the tree sha of the latest commit
    const { commit: { tree: { sha: treeSha } } } = commits[0];
    const currentCommitSha = commits[0].sha;

    const { data: { tree: gitTree } } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/trees/${treeSha}`, {
      params: {
        ref: branchRef,
      },
      headers,
    });

    return { gitTree, currentCommitSha };
  } catch (err) {
    console.log(err);
  }
}

// retrieve the tree from given tree sha
async function getTree(repo, accessToken, treeSha, branchRef='staging') {
  try {
    const headers = {
      Authorization: `token ${accessToken}`,
      Accept: 'application/json',
    };

    const { data: { tree: gitTree } } = await axios.get(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/trees/${treeSha}`, {
      params: {
        ref: branchRef,
      },
      headers,
    });

    return { gitTree };
  } catch (err) {
    console.log(err);
  }
}

// send the new tree object back to Github and point the latest commit on the staging branch to it
async function sendTree(gitTree, currentCommitSha, repo, accessToken, message, branchRef='staging') {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: 'application/json',
  };
  const resp = await axios.post(`https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/trees`, {
    tree: gitTree,
  }, {
    headers,
  });

  const { data: { sha: newTreeSha } } = resp;

  const baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/refs`;
  const baseCommitEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/commits`;
  const refEndpoint = `${baseRefEndpoint}/heads/${branchRef}`;

  const newCommitResp = await axios.post(baseCommitEndpoint, {
    message: message,
    tree: newTreeSha,
    parents: [currentCommitSha],
  }, {
    headers,
  });

  const newCommitSha = newCommitResp.data.sha;

  /**
   * The `staging` branch reference will now point
   * to `newCommitSha` instead of `currentCommitSha`
   */
  await axios.patch(refEndpoint, {
    sha: newCommitSha,
    force: true,
  }, {
    headers,
  });
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
  getRootTree,
  getTree,
  sendTree,
}
