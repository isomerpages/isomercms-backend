const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

// Env vars
const FRONTEND_URL = process.env.FRONTEND_URL

// Import routes
const indexRouter = require('./routes/index')
const authRouter = require('./routes/auth')
const sitesRouter = require('./routes/sites')
const pagesRouter = require('./routes/pages')
const collectionsRouter = require('./routes/collections')
const collectionPagesRouter = require('./routes/collectionPages')
const resourceRoomRouter = require('./routes/resourceRoom')
const resourcesRouter = require('./routes/resources')
const resourcePagesRouter = require('./routes/resourcePages')
const imagesRouter = require('./routes/images')
const documentsRouter = require('./routes/documents')
const menuRouter = require('./routes/menus')
const homepageRouter = require('./routes/homepage')
const menuDirectoryRouter = require('./routes/menuDirectory')

const app = express();

app.use(logger('dev'));
app.use(express.json({ limit: '5mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  'origin': FRONTEND_URL,
  'credentials': true,
}))

// Routes layer setup
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/sites', sitesRouter)
app.use('/sites', pagesRouter)
app.use('/sites', collectionsRouter)
app.use('/sites', collectionPagesRouter)
app.use('/sites', resourceRoomRouter)
app.use('/sites', resourcesRouter)
app.use('/sites', resourcePagesRouter)
app.use('/sites', imagesRouter)
app.use('/sites', documentsRouter)
app.use('/sites', menuRouter)
app.use('/sites', homepageRouter)
app.use('/sites', menuDirectoryRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: err });
});

module.exports = app;
