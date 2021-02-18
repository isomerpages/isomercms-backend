const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

// Env vars
const FRONTEND_URL = process.env.FRONTEND_URL

// Import middleware
const { apiLogger } = require('./middleware/apiLogger')
const { auth } = require('./middleware/auth')
const { errorHandler } = require('./middleware/errorHandler')

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
const settingsRouter = require('./routes/settings')
const navigationRouter = require('./routes/navigation')
const netlifyTomlRouter = require('./routes/netlifyToml')

const app = express();

app.use(logger('dev'));
app.use(cors({
  'origin': FRONTEND_URL,
  'credentials': true,
}))
app.use(express.json({ limit: '7mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Use auth middleware
app.use(auth)

// Log api requests
app.use(apiLogger)

// Routes layer setup
app.use('/v1', indexRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/sites', sitesRouter)
app.use('/v1/sites', pagesRouter)
app.use('/v1/sites', collectionsRouter)
app.use('/v1/sites', collectionPagesRouter)
app.use('/v1/sites', resourceRoomRouter)
app.use('/v1/sites', resourcesRouter)
app.use('/v1/sites', resourcePagesRouter)
app.use('/v1/sites', imagesRouter)
app.use('/v1/sites', documentsRouter)
app.use('/v1/sites', menuRouter)
app.use('/v1/sites', homepageRouter)
app.use('/v1/sites', menuDirectoryRouter)
app.use('/v1/sites', settingsRouter)
app.use('/v1/sites', navigationRouter)
app.use('/v1/sites', netlifyTomlRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(errorHandler);

module.exports = app;
