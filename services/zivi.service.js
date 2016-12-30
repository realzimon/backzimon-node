var models = require('../models/index');

var ZiviService = {};

ZiviService.findOneByName = function (name, callback) {
  models.Zivi.findOne({name: name}).then(function (zivi) {
    callback(zivi);
  });
};

ZiviService.findAll = function (callback) {
  models.Zivi.find({}).then(callback);
};

ZiviService.findAllBut = function (ziviExcluded, callback) {
  if (!ziviExcluded) {
    ZiviService.find({}).then(callback);
  } else {
    models.Zivi.find({
      _id: {
        $ne: ziviExcluded._id
      }
    }).then(callback);
  }
};

module.exports = ZiviService;
