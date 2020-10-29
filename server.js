const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

// Env vars
const FRONTEND_URL = process.env.FRONTEND_URL

// Import middleware
const { auth } = require('./middleware/auth')
const { errorHandler } = require('./middleware/errorHandler')

// Import routes
const indexRouter = require('./routes/index')
const authRouter = require('./routes/auth')
const cookieValidationRouter = require('./routes/cookieValidation')
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

// Use auth middleware
app.use(auth)

// Routes layer setup
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/cookie-validation', cookieValidationRouter)
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
app.use('/sites', settingsRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(errorHandler);

module.exports = app;
