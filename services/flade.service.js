var htmlparser = require('htmlparser2');
var https = require('https');
var models = require('../models/index');
var SocketService = require('./socket.service');

const FladeService = {};

var errCounter = 0;

FladeService.findFlade = function (callback) {
  FladeService.getCachedFlade(function (flade) {
    if (flade && !isThirtyMinutesOrMoreAgo(new Date(flade.timestamp))) {
      callback && callback(flade);
    } else {
      retrieveFlade(callback)
    }
  });
};

function isThirtyMinutesOrMoreAgo(date) {
  return (new Date() - date) >= 30 * 60 * 1000;
}

function retrieveFlade(callback) {
  https.get({
    host: 'fladerei.com',
    path: '/dyn_inhalte/tagesflade.html'
  }, function (res) {
    if (res.statusCode !== 200) {
      errWithRateLimit('Failed to retrieve flade:', res);
      res.resume();
      return;
    }
    var content = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      content += chunk;
    });
    res.on('end', function () {
      parseContentToFlade(content, function (result) {
        updateCurrentFlade(result, callback);
      });
    });
  }).on('error', function (err) {
    errWithRateLimit('Failed to retrieve flade..', err);
  });
}

function errWithRateLimit(msg, err) {
  errCounter++;
  if (errCounter < 2) {
    console.error(msg, err);
  } else if (errCounter > 10) {
    errCounter = 0;
    console.error(msg, err, 'and 8 more...');
  }
}

function parseContentToFlade(content, callback) {
  var berggasse = false;
  var tagesflade = false;
  var Parser = new htmlparser.Parser({
    onopentag: function (name, attribs) {
      if (name === 'a' && attribs.href.indexOf('berggasse') !== -1) {
        berggasse = true;
      } else if (name === 'span' && berggasse) {
        tagesflade = true;
      }
    },
    ontext: function (text) {
      if (tagesflade) {
        callback && callback(text.replace(/&nbsp;/gi, ''));
      }
    },
    onclosetag: function (tagname) {
      if (tagname === 'span' && berggasse && tagesflade) {
        berggasse = tagesflade = false;
      }
    }
  });

  Parser.write(content);
  Parser.end();
}

function updateCurrentFlade(text, callback) {
  models.Flade.remove({}, function () {
    var flade = new models.Flade({
      text: text,
      timestamp: new Date()
    });
    flade.save(function (err, flade) {
      callback && callback(flade);
      SocketService.writeToSocket('flade', flade);
    });
  });
}

FladeService.getCachedFlade = function (callback) {
  models.Flade.findOne({}).then(function (flade) {
    callback && callback(flade);
  })
};

module.exports = FladeService;

