var models = require('../models/index');
var ZiviService = require('./../services/zivi.service.js');
var SocketService = require('./../services/socket.service');

var ZiviTimer = {};
var previousFirst = false;
const TIMER_SOCKET_NAME = 'timer';
ZiviTimer.ZIVI_TIMER_INTERVAL = 600;
ZiviTimer.remainingSeconds = ZiviTimer.ZIVI_TIMER_INTERVAL;

ZiviTimer.pushTimerData = function () {
  SocketService.writeToSocket(TIMER_SOCKET_NAME, {
    remaining: ZiviTimer.remainingSeconds
  });
};

ZiviTimer.shuffleZivisAndSaveOrder = function () {
  ZiviService.findAll(function (err, zivis) {
    if (err) {
      return console.error(' ## Failed to shuffle zivis', err);
    } else if (!zivis || zivis.length === 0) {
      return console.error(' ## No zivis to shuffle');
    }
    var shuffledZivis = shuffle(shuffle(zivis));
    while (previousFirst && shuffledZivis[0].name === previousFirst.name) {
      console.log(' --- Shuffling again because', previousFirst.name, 'was first last time too');
      shuffledZivis = shuffle(zivis);
    }
    previousFirst = shuffledZivis[0];
    for (var i = 0; i < shuffledZivis.length; i++) {
      var zivi = shuffledZivis[i];
      if (zivi) { // idk
        zivi.order = i;
        zivi.save();
      }
    }
  });
};

// Fisher-Yates Shuffle algorithm from https://stackoverflow.com/a/2450976/1117552
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
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
