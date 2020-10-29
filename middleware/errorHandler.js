function errorHandler (err, req, res, next) {
    console.log(`${new Date()}: ${err}`)
  
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.json({ error: err });
  }

module.exports = {
    errorHandler,
}
  