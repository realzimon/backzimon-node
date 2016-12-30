var shuffle = require('shuffle-array');
var models = require('../models/index');
var ZiviService = require('./../services/zivi.service.js');
var SocketService = require('./../services/socket.service');

var ZiviTimer = {};
const TIMER_SOCKET_NAME = 'timer';
ZiviTimer.ZIVI_TIMER_INTERVAL = 600;
ZiviTimer.remainingSeconds = ZiviTimer.ZIVI_TIMER_INTERVAL;

ZiviTimer.pushTimerData = function () {
  SocketService.writeToSocket(TIMER_SOCKET_NAME, {
    remaining: ZiviTimer.remainingSeconds
  });
};

ZiviTimer.shuffleZivisAndSaveOrder = function () {
  ZiviService.findAll(function (zivis) {
    var ziviCount = zivis.length;
    var selectedZivis = [];
    for(var i = 0; i <= ziviCount; i++){
      var zivi = selectZiviFairly(createFairArray(getMaxFirstZiviCount(zivis), zivis));
      selectedZivis.push(zivi);
      zivis = zivis.filter(function(element){
        return element._id !== zivi._id;
      });
    }
    if (selectedZivis.length > 0) {
      selectedZivis[0].first += 1;
      for (var j = 0; j < selectedZivis.length; j++) {
        selectedZivis[j].order = j + 1;
        selectedZivis[j].save();
      }
    }
  });
};

function getMaxFirstZiviCount(zivis){
  var max = -1;
  zivis.forEach(function(zivi){
    if(zivi.first > max){
      max = zivi.first;
    }
  });
  return max;
}

function createFairArray(max, zivis){
  var fairArray = [];
  zivis.forEach(function(zivi){
    for(var i = 0; i < max - zivi.first + 1; i++){
      fairArray.push(zivi);
    }
  });
  return fairArray;
}

function selectZiviFairly(fairArray){
  shuffle(fairArray);
  return fairArray[0];
}

function tickTimer() {
  ZiviTimer.remainingSeconds--;
  ZiviTimer.pushTimerData();
  if (ZiviTimer.remainingSeconds === 0) {
    ZiviTimer.remainingSeconds = ZiviTimer.ZIVI_TIMER_INTERVAL;
    ZiviTimer.shuffleZivisAndSaveOrder();
  }
}

ZiviTimer.shuffleZivisAndSaveOrder();
setInterval(tickTimer, 1000);

module.exports = ZiviTimer;
