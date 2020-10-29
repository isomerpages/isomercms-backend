class AuthError extends Error {
    constructor (message) {
        super()
        Error.captureStackTrace(this, this.constructor)
        this.name = this.constructor.name
        this.status = 401
        this.message = message || 'Something went wrong'
    }
}

module.exports = {
    AuthError,
}