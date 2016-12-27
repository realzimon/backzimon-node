var fs = require('fs');
var models = require('../models/index');
var quotes = JSON.parse(fs.readFileSync('./config/quotes.json', 'utf8'));
var zivis = JSON.parse(fs.readFileSync('./config/zivis.json', 'utf8'));

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
});

models.Zivi.remove({}, function(){
  console.log('Removed all zivi entries');
  //Insert each element from the quotes config file
  zivis.forEach(function(el){
    var zivi = new models.Zivi({
      name: el.name,
      name_mx: el.name_mx,
      post_count: el.post_count
    });
    zivi.save(function (err, res) {
      console.log('Inserted: ', res);
    });
  });
});
