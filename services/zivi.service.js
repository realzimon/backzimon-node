var models = require('../models/index');

var ZiviService = {};

ZiviService.findBy = function (conditions, callback) {
  models.Zivi.find(conditions, callback);
};

ZiviService.findOneByName = function (name, callback) {
  models.Zivi.findOne({name: name}, callback);
};

ZiviService.findAll = function (callback) {
  ZiviService.findBy({}, callback);
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

ZiviService.saveZivi = function (zivi, callback) {
  zivi.save(callback);
};

ZiviService.deleteZivi = function (zivi, callback) {
  var ripZivi = {};
  for (var propName in zivi) {
    if (zivi.hasOwnProperty(propName) && propName !== '_id' && propName !== 'id' && propName !== '__v') {
      ripZivi[propName] = zivi[propName];
    }
  }
  models.DeletedZivi.create(ripZivi, function (err) {
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
  ZiviService.findOneByName(name, function (err, zivi) {
    if (err) {
      return callback && callback(err);
    } else if (!zivi) {
      return callback && callback({code: 'ENOTFOUND', message: 'No zivi by that name: ' + name});
    }
    for (var propName in spec) {
      if (spec.hasOwnProperty(propName) && propName !== '_id') {
        zivi[propName] = spec[propName];
      }
    }
    ZiviService.saveZivi(zivi, callback);
  })
};

module.exports = ZiviService;
