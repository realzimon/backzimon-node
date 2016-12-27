var fs = require('fs');
var obj = JSON.parse(fs.readFileSync('./quotes.json', 'utf8'));
const db = require('monk')('127.0.0.1/zimon');
const quotes = db.get('quotes');

//Remove old quotes, in case there is something wrong stored in the db and also to avoid duplicates
quotes.remove({}, function(){
  //Insert each element from the quotes config file
  obj.forEach(function(el){
    quotes.insert({text: el.quote})
  });
});