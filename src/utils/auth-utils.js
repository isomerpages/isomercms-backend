function isSecure() {
  return (
    process.env.NODE_ENV !== "DEV" &&
    process.env.NODE_ENV !== "LOCAL_DEV" &&
    process.env.NODE_ENV !== "test"
  )
}

module.exports = {
  isSecure,
}
