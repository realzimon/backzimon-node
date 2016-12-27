var express = require('express');
var router = express.Router();

var models = require('../../models/index');

/* GET home page. */
router.get('/', function (req, res) {
  models.Quote.find({}).then(function(response){
    res.json(response);
  });
});

router.get('/random', function (req, res) {

  models.Quote.find({}).then(function(response){
    res.json({
      'quote': response[Math.floor(Math.random() * response.length)]
    })
  });
});

router.post('/', function(req, res){
  var text = req.body.text;
  if(!text){
    return res.status(400).json({
      err: 'No text given'
    })
  }
  models.Quote.findOne({text: text}, function(err, result){
    if(err){
      return res.status(500).json({
        err: err
      })
    }
    if(result){
      return res.status(200).json();
    }
    var quote = new models.Quote({
      text: text,
      count: 0
    });

    quote.save(function(err, _){
      if(err){
        return res.status(500).json({
          err: err
        })
      }
      return res.status(201).json();
    });
  });

});

module.exports = router;
