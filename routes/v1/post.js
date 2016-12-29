var express = require('express');
var router = express.Router();

var models = require('../../models/index');

router.get('/', function (req, res) {
  models.Post.findOne({}).then(function(response){
    return res.json(response);
  });
});

router.post('/', function(req, res){
  return res.json(null);
});

module.exports = router;
