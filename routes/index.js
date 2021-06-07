const express = require("express")

const router = express.Router()
const uuid = require("uuid/v4")

const { CLIENT_ID } = process.env
const { REDIRECT_URI } = process.env

/* GET home page. */
function getCmsHomepage(req, res) {
  return res.status(200).json({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: uuid(),
  })
}
router.get("/", getCmsHomepage)

module.exports = router
