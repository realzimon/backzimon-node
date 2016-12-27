var express = require('express');
var router = express.Router();

var quotes = [
  '#DanielVCS',
  'Sorry not sorry',
  'Daniel machts, keine Anfechtung möglich'
];

/* GET home page. */
router.get('/all', function (req, res) {
  res.json(quotes);
});

router.get('/random', function (req, res) {
  res.json(quotes[Math.floor(Math.random() * quotes.length)])
});

module.exports = router;
