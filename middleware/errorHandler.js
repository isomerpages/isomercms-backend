const { serializeError } = require('serialize-error')

function errorHandler (err, req, res, next) {
    console.log(`${new Date()}: ${JSON.stringify(serializeError(err))}`)
  
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // Error handling for custom errors
    if (err.isIsomerError) {
        res.status(err.status).json({
            error: {
                name: err.name,
                code: err.status,
                message: err.message,
            },
        })
    } else {
        res.status(500).json({
            error: {
                code: 500,
                message: 'Something went wrong',
            },
        })
    }
  }

module.exports = {
    errorHandler,
}
  