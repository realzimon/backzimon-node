var express = require('express');
var router = express.Router();

var models = require('../../models/index');
var ZiviService = require('../../services/zivi.service');

router.get('/', function (req, res) {
  models.Zivi.find({}).sort('order').exec(function(err, response){
    console.log(err);
    return res.json({
      zivicount: response.length,
      zivis: response
    });
  });
});

router.get('/random', function (req, res) {
  models.Zivi.find({}).then(function(response){
    return res.json(response[Math.floor(Math.random() * response.length)])
  });
});

module.exports = router;
