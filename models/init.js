var fs = require('fs');
var async = require('async');
const STATES = require('./states');
var models = require('../models/index');
var quotes = JSON.parse(fs.readFileSync('./config/quotes.json', 'utf8'));
var zivis = JSON.parse(fs.readFileSync('./config/zivis.json', 'utf8'));

async.parallel({
  initQoutes: function(callback){
    models.Quote.remove({}, function(){
      console.log('Removed all quote entries');
      //Insert each element from the quotes config file
      quotes.forEach(function(el){
        var quote = new models.Quote({
          text: el.quote,
          count: 0
        });
        quote.save(function (err, res) {
          console.log('Inserted: ', res);
        });
      });
      callback();
    });
  },
  initZivis: function(callback){
    models.Zivi.remove({}, function(){
      console.log('Removed all zivi entries');
      //Insert each element from the quotes config file
      zivis.forEach(function(el){
        var zivi = new models.Zivi({
          name: el.name,
          name_mx: el.name_mx,
          post_count: el.post,
          color: el.color,
          colorHex: el.colorHex,
          picture: el.picture,
          first: 0,
          order: 0,
          chat: -1
        });
        zivi.save(function (err, res) {
          console.log('Inserted: ', res);
        });
      });
      callback();
    });
  },
  initPost: function(callback){
    models.Post.remove({}, function(){
      console.log('Removed previous post state');
      var post = new models.Post({
        state: STATES.IDLE,
        timestamp: new Date(),
        zivi: null
      });
      post.save(function (err, res) {
        console.log('Inserted: ', res);
        callback();
      });
    });
  }
}, function(){
  console.log('Init complete');
  process.exit(0);
});