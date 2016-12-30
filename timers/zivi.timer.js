var io = require('socket.io')(4001);
var shuffle = require('shuffle-array');
var models = require('../models/index');
var ZiviService = require('./../services/zivi.service.js');

var ZiviTimer = {};
const TIMER_SOCKET_NAME = 'timer';
ZiviTimer.ZIVI_TIMER_INTERVAL = 600;
ZiviTimer.remainingSeconds = ZiviTimer.ZIVI_TIMER_INTERVAL;

ZiviTimer.pushTimerData = function () {
  io.sockets.emit(TIMER_SOCKET_NAME, {
    remaining: ZiviTimer.remainingSeconds
  });
};

ZiviTimer.shuffleZivisAndSaveOrder = function () {
  ZiviService.findAll(function (zivis) {
    shuffle(zivis);
    if (zivis.length > 0) {
      zivis[0].first += 1;
      for (var i = 0; i < zivis.length; i++) {
        zivis[i].order = i + 1;
        zivis[i].save();
      }
    }
  });
};

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

return ZiviTimer;
