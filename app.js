var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var quotes = require('./routes/v1/quotes');
var zivis = require('./routes/v1/zivis');
var post = require('./routes/v1/post');
var flade = require('./routes/v1/flade');

require('./timers/zivi.timer.js');
require('./services/telegram.service');
var NetUsageService = require('./services/netusage.service');

const FIVE_SECONDS = 5 * 1000;
setInterval(NetUsageService.loadAndPushNetUsage, FIVE_SECONDS);

var PostTimer = require('./timers/post.timer.js');
setInterval(PostTimer.checkAndNotify, FIVE_SECONDS);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use('/api/v1/quotes', quotes);
app.use('/api/v1/zivis', zivis);
app.use('/api/v1/post', post);
app.use('/api/v1/flade', flade);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
