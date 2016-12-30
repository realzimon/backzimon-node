var models = require('../models/index');

var ZiviService = {};

ZiviService.findOneByName = function (name, callback) {
  models.Zivi.findOne({name: name}).then(function (zivi) {
    callback(zivi);
  });
};

ZiviService.findAll = function (callback) {
  models.Zivi.findAll(callback);
};

ZiviService.findAllBut = function (ziviExcluded, callback) {
  if (!ziviExcluded) {
    ZiviService.findAll(callback);
  } else {
    models.Zivi.find({
      _id: {
        $ne: ziviExcluded._id
      }
    }, callback);
  }
};

return ZiviService;
