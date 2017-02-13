/**
 * Created by DZDomi on 13.02.17.
 */
var fs = require('fs');
var async = require('async');
var models = require('../models/index');
var zivis = JSON.parse(fs.readFileSync('./config/zivis.json', 'utf8'));

zivis.forEach(function(zivi){

  models.Zivi.update({
    name: zivi.name
  }, {
    addresses: zivi.addresses
  }).then(function(err){
    console.log(err);
  });

});
