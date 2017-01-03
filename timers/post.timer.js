var shuffle = require('shuffle-array');
const STATES = require('../models/states');
var models = require('../models/index');
var PostService = require('./../services/post.service');
var ZiviService = require('./../services/zivi.service');
var TelegramService = require('./../services/telegram.service');

var TIME_FOR_PREP;
var TIME_FOR_ACTION;
var TIME_FOR_REMINDER;
var TIME_FOR_IDLE;

var PostTimer = {};

PostTimer.checkAndNotify = function () {
  const now = new Date();
  if (!isWeekend(now)) {
    PostTimer.checkWithTime(now);
  }
};

PostTimer.checkWithTime = function (date, callback) {
  PostService.findCurrentState(function (post) {
    var expectedState = getStateForTime(date);
    var action = determineAction(date, post, expectedState);
    if (action) {
      console.info(' -- PostTimer: Changing state from', post.state, 'to', expectedState, 'at', date);
      action();
    }
    callback && callback(post, action, expectedState);
  });
};

function determineAction(date, post, expectedState) {
  if (post.state === expectedState) {
    return;
  }
  var action;
  switch (post.state) {
    case STATES.IDLE:
      action = determineActionForIdleState(expectedState);
      break;
    case STATES.PREPARATION:
      action = determineActionForPrepState(expectedState);
      break;
    case STATES.ACTION:
      action = determineActionForActionState(date, expectedState);
      break;
    case STATES.REMINDER:
      action = determineActionForReminderState(expectedState);
      break;
  }
  return action;
}

function determineActionForIdleState(expectedState) {
  switch (expectedState) {
    case STATES.PREPARATION:
      return function () {
        PostService.startPreparationState(function (err, post) {
          TelegramService.sendZiviUpdateToUser(post.zivi, 'You are the selected postler');
          return console.log(' -- PostTimer: Changed to preparation state.');
        });
      };
    default:
      return;
  }
}

function determineActionForPrepState(expectedState) {
  switch (expectedState) {
    //Expected state change, we credit the user if he did not accept it automatically
    case STATES.ACTION:
      return function () {
        PostService.acceptPost(function (err, zivi) {
          TelegramService.sendZiviUpdateToUser(zivi, 'You automatically accepted the offer, because you did not respond.');
          return console.log(' -- PostTimer: Zivi ', zivi.name, ' did not accept the offer, cruelly accepting for them.');
        });
      };
    case STATES.REMINDER:
    case STATES.IDLE:
      return function () {
        PostService.justSetState(STATES.IDLE, function () {
          return console.log(' -- PostTimer: Preparation state ended without action state being expected.');
        });
      };
  }
}

function determineActionForActionState(date, expectedState) {
  switch (expectedState) {
    case STATES.REMINDER:
      return function () {
        PostService.startReminderState(function () {
          return console.log(' -- PostTimer: Action state could possibly be done, but we don\'t  know, switching to reminder.');
        });
      };
    case STATES.PREPARATION:
      return function () {
        PostService.findCurrentState(function (post) {
          if ((post.timestamp < TIME_FOR_PREP[0] || post.timestamp >= TIME_FOR_ACTION[0]) && (post.timestamp < TIME_FOR_PREP[1] || post.timestamp >= TIME_FOR_ACTION[1])) {
            PostService.startPreparationState(function (err, zivi) {
              TelegramService.sendZiviUpdateToUser(zivi, 'You are the selected Postler!');
              return console.log('-- PostTimer: Starting preparation state right out of action because we don\'t care apparently.');
            });
          }
        });
      };
    case STATES.IDLE:
      return function () {
        PostService.justSetState(STATES.IDLE, function () {
          return console.log('-- PostTimer: Switching from action to idle because reminders are for beginners.');
        });
      };
  }
}

function determineActionForReminderState(expectedState) {
  switch (expectedState) {
    case STATES.ACTION:
    case STATES.IDLE:
      return function () {
        PostService.justSetState(STATES.IDLE, function () {
          return console.log(' -- PostTimer: Switching from reminder to idle state because who needs the yellow card anyways.');
        });
      };
    case STATES.PREPARATION:
      return function () {
        PostService.startPreparationState(function (post) {
          TelegramService.sendZiviUpdateToUser(post.zivi, 'You are the selected postler');
          return console.log(' -- PostTimer: Switching from reminder to preparation state because who needs the yellow card anyways.');
        });
      };
  }
}

function getStateForTime(date) {
  if (timeForIdle(date)) {
    return STATES.IDLE;
  } else if (timeForAction(date)) {
    return STATES.ACTION;
  } else if (timeForPrep(date)) {
    return STATES.PREPARATION;
  } else {
    return STATES.REMINDER;
  }
}

function timeForPrep(date) {
  return (date >= TIME_FOR_PREP[0] && date < TIME_FOR_ACTION[0]) || (date >= TIME_FOR_PREP[1] && date < TIME_FOR_ACTION[1]);
}

function timeForIdle(date) {
  return date < TIME_FOR_PREP[0] || date > TIME_FOR_IDLE[1] || (date >= TIME_FOR_IDLE[0] && date < TIME_FOR_PREP[1]);
}

function timeForAction(date) {
  return (date >= TIME_FOR_ACTION[0] && date < TIME_FOR_REMINDER[0]) || (date >= TIME_FOR_ACTION[1] && date < TIME_FOR_REMINDER[1]);
}

function initTimes() {

  TIME_FOR_PREP = [
    PostTimer.hourMinuteDateToday(10, 45),
    PostTimer.hourMinuteDateToday(14, 45)
  ];

  TIME_FOR_ACTION = [
    PostTimer.hourMinuteDateToday(11, 0),
    PostTimer.hourMinuteDateToday(15, 0)
  ];

  TIME_FOR_REMINDER = [
    PostTimer.hourMinuteDateToday(11, 15),
    PostTimer.hourMinuteDateToday(15, 15)
  ];

  TIME_FOR_IDLE = [
    PostTimer.hourMinuteDateToday(11, 30),
    PostTimer.hourMinuteDateToday(15, 30)
  ]
}

PostTimer.hourMinuteDateToday = function (hours, minutes) {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
};

function isWeekend(date) {
  return date.getDay() == /* Saturday */ 6 || date.getDay() == /* Sunday */ 0;
}

initTimes();
PostService.pushPostState();

module.exports = PostTimer;
