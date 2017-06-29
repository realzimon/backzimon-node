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

ZiviService.saveZivi = function (zivi, callback) {
  zivi.save(callback);
};

ZiviService.deleteZivi = function (zivi, callback) {
  models.DeletedZivi.create(zivi, function (err) {
    if (err) {
      callback && callback(err);
    } else {
      zivi.remove(callback);
    }
  })
};

ZiviService.createZivi = function (obj, callback) {
  models.Zivi.create(obj, callback);
};

ZiviService.updateZiviByName = function (name, spec, callback) {
  ZiviService.findOneByName(name, function (zivi) {
    for(var propName in obj) {
      if(obj.hasOwnProperty(propName) && propName !== '_id') {
        zivi[propName] = obj[propName];
      }
    }
    ZiviService.saveZivi(zivi, callback);
  })
};

module.exports = ZiviService;
