var htmlparser = require('htmlparser2');
var https = require('https');
var models = require('../models/index');

const FladeService = {};

FladeService.getAndSaveCurrentFlade = function(callback){
  isFladeFromToday(function(fromToday){
    if(!fromToday){
      updateFlade(callback);
    } else {
      FladeService.getCurrentFlade(callback);
    }
  });
};

function isFladeFromToday(callback){
  FladeService.getCurrentFlade(function(flade){
    if(!flade){
      callback(false);
    } else {
      callback(new Date(flade.timestamp).toDateString() === new Date().toDateString());
    }
  })
}

function updateFlade(callback){
  https.get({
    host: 'fladerei.com',
    path: '/dyn_inhalte/tagesflade.html'
  }, function(res){
    var content = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      content += chunk;
    });
    res.on('end', function(){
      parseContentToFlade(content, function(result){
        updateCurrentFlade(result, callback);
      });
    });
  });
}

function parseContentToFlade(content, callback){
  var berggasse = false;
  var tagesflade = false;
  var Parser = new htmlparser.Parser({

    onopentag: function(name, attribs){
      if(name === 'a' && attribs.href.indexOf('berggasse') !== -1){
        berggasse = true;
      } else if (name === 'span' && berggasse){
        tagesflade = true;
      }
    },
    ontext: function(text){
      if(tagesflade){
        callback(text.replace(/&nbsp;/gi,''));
      }
    },
    onclosetag: function(tagname){
      if(tagname === 'span' && berggasse && tagesflade){
        berggasse = tagesflade = false;
      }
    }
  });

  Parser.write(content);
  Parser.end();
}

function updateCurrentFlade(text, callback){
  models.Flade.remove({}, function(){
    var flade = new models.Flade({
      text: text,
      timestamp: new Date()
    });
    flade.save(function(err, flade){
      callback(flade);
    });
  });
}

FladeService.getCurrentFlade = function(callback){
  models.Flade.findOne({}).then(function(flade){
    callback(flade);
  })
};

module.exports = FladeService;
