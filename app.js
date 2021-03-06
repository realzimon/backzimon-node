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
var ConfigService = require('./services/config.service');
var PostTimer = require('./timers/post.timer.js');
var FladeService = require('./services/flade.service');

const A_SECOND = 1000;
if (ConfigService.isNetUsageEnabled()) {
  var NetUsageService = require('./services/netusage.service');
  setInterval(NetUsageService.loadAndPushNetUsage, NetUsageService.PUSH_INTERVAL_SECONDS * A_SECOND);
} else {
  console.log('To enable polling and sending of network usage, set net-usage-host and -path in config/local-config.json.');
}
const FIVE_SECONDS = 5 * A_SECOND;
setInterval(PostTimer.checkAndNotify, FIVE_SECONDS);
const TWO_HOURS = 2 * 60 * 60 * A_SECOND;
setInterval(FladeService.findFlade, TWO_HOURS);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev', {
  skip: function (req, res) {
    return res.statusCode < 400
  }
}));
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

