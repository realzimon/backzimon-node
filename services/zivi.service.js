var models = require('../models/index');

var ZiviService = {};

ZiviService.findOneByName = function (name, callback) {
  models.Zivi.findOne({name: name}).then(callback);
};

ZiviService.findAll = function (callback) {
  models.Zivi.find({}).then(callback);
};

ZiviService.findAllBut = function (ziviExcluded, callback) {
  if (!ziviExcluded) {
    ZiviService.findAll(callback);
  } else {
    models.Zivi.find({
      _id: {
        $ne: ziviExcluded._id
      }
    }).then(callback);
  }
};

ZiviService.saveZivi = function(zivi, callback){
  zivi.save(callback);
};

ZiviService.deleteZivi = function (zivi, callback) {
  models.DeletedZivi.create(zivi, function (err) {
    if(err) {
      callback && callback(err);
    } else {
      zivi.remove(callback);
    }
  })
};

module.exports = ZiviService;
