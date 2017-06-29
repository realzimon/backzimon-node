var express = require('express');
var router = express.Router();

var FladeService = require('../../services/flade.service');

router.get('/', function (req, res) {
  FladeService.findFlade(function (err, flade) {
    return res.json({
      error: err,
      flade: flade
    });
  });
});

module.exports = router;
