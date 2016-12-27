var express = require('express');
var router = express.Router();

const db = require('monk')('127.0.0.1/zimon');
const quotes = db.get('quotes');

/* GET home page. */
router.get('/', function (req, res) {
  quotes.find({}).then(function(response){
    res.json(response);
  });
});

router.get('/random', function (req, res) {

  quotes.find({}).then(function(response){
    res.json({
      'quote': response[Math.floor(Math.random() * response.length)]
    })
  });
});

module.exports = router;
