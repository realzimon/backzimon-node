var models = require('../models/index');

var ZiviService = {};

ZiviService.findBy = function (conditions, callback) {
  models.Zivi.find(conditions, callback);
};

ZiviService.findOneByName = function (name, callback) {
  ZiviService.findBy({name: name}, callback);
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
  ZiviService.findOneByName(name, function (err, zivi) {
    if (err) {
      return callback && callback(err);
    }
    for (var propName in obj) {
      if (obj.hasOwnProperty(propName) && propName !== '_id') {
        zivi[propName] = obj[propName];
      }
    }
    ZiviService.saveZivi(zivi, callback);
  })
};

module.exports = ZiviService;
