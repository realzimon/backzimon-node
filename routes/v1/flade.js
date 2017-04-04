var express = require('express');
var router = express.Router();

var FladeService = require('../../services/flade.service');

router.get('/', function (req, res) {
  FladeService.findFlade(function (flade) {
    return res.json(flade);
  });
});

module.exports = router;
