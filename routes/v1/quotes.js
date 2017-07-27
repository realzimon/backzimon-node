var express = require('express');
var router = express.Router();

var models = require('../../models/index');

router.get('/', function (req, res) {
  models.Quote.find({}).then(function (quotes) {
    return res.json({count: quotes.length, quotes: quotes});
  });
});

router.get('/random', function (req, res) {
  models.Quote.find({}).then(function (response) {
    return res.json({
      quote: response[Math.floor(Math.random() * response.length)]
    })
  });
});

router.post('/create', function (req, res) {
  var text = req.body.text;
  if (!text) {
    return res.status(400).json({
      err: 'No text given'
    })
  }
  models.Quote.findOne({text: text}, function (err, existingQuote) {
    if (err) {
      return res.status(500).json({
        err: err
      })
    }
    if (existingQuote) {
      return res.status(200).json({quote: existingQuote});
    }
    var newQuote = new models.Quote({
      text: text,
      count: 0
    });

    newQuote.save(function (err) {
      if (err) {
        return res.status(500).json({
          err: err
        })
      } else {
        return res.status(201).json({quote: newQuote});
      }
    });
  });

});

router.post('/update', function (req, res) {
  var originalText = req.body && req.body.originalText;
  var newText = req.body && req.body.newText;
  if (!originalText || !newText) {
    return res.status(400).json({
      err: 'Need both originalText and newText.'
    })
  }
  models.Quote.findOne({text: originalText}, function (err, quote) {
    if (err || !quote) {
      return res.status(500).json({
        err: err || 'unknown error'
      })
    }
    console.log(' --- changing quote text from "' + originalText + '" to "' + newText + '"');
    quote.text = newText;
    quote.save(function (err, savedQuote) {
      if (err) {
        return res.status(500).json({err: err});
      } else {
        return res.status(200).json({quote: savedQuote});
      }
    });
  });
});

router.post('/delete', function (req, res) {
  var text = req.body && req.body.text;
  if (!text) {
    return res.status(400).json({
      err: 'Need a text to match with.'
    })
  }
  models.Quote.findOne({text: text}, function (err, quote) {
    if (err || !quote) {
      return res.status(500).json({
        err: err || 'unknown error'
      })
    }
    console.log(' --- deleting quote "' + text + '"');
    quote.remove(function (err, deletedQuote) {
      if (err) {
        return res.status(500).json({err: err});
      } else {
        return res.status(200).json({deletedQuote: deletedQuote});
      }
    });
  });
});

module.exports = router;
