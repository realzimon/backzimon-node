var express = require('express');
var router = express.Router();

var models = require('../../models/index');
var ZiviService = require('../../services/zivi.service');

router.get('/', function (req, res) {
  models.Zivi.find({}).sort('order').exec(function(err, response){
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

router.post('/delete', function (req, res) {
  var name = req.body.name;
  if(!name) {
    return res.status(400).json({error: "No name given"});
  }
  var zivi = ZiviService.findOneByName(name, function (err, zivi) {
    if(err) {
      return res.status(500).json({error: err});
    }
    ZiviService.deleteZivi(zivi, function (err) {
      if(err) {
        return res.status(500).json({error: err});
      } else {
        return res.status(200).json({error: false});
      }
    })
  });
});

router.post('/update', function (req, res) {
  var name = req.body.name;
  var spec = req.body.spec;
  if(!name || typeof name !== "string" || !spec || typeof spec !== "object") {
    return res.status(400).json({error: "body needs name (String) and spec (object) properties"});
  }
  ZiviService.updateZiviByName(name, spec, function (err, zivi) {
    if(err) {
      return res.status(500).json({error: err});
    } else {
      return res.status(200).json({zivi: zivi});
    }
  });
});

module.exports = router;
