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
  var action;
  switch (post.state) {
    case STATES.IDLE:
      action = determineActionForIdleState(expectedState);
      break;
    case STATES.PREPARATION:
      action = determineActionForPrepState(expectedState);
      break;
    case STATES.ACTION:
      action = determineActionForActionState(date, post, expectedState);
      break;
    case STATES.REMINDER:
      action = determineActionForReminderState(expectedState);
      break;
  }
  return action;
}

var invokePreparationState = function () {
  return function () {
    PostService.startPreparationState(function (err, post) {
      TelegramService.sendZiviUpdateToUser(post.zivi, 'Congratulations! You are the selected Postler!');
      return console.log(' -- PostTimer: Changed to preparation state.');
    });
  };
};
function determineActionForIdleState(expectedState) {
  switch (expectedState) {
    case STATES.PREPARATION:
    case STATES.ACTION:
      return invokePreparationState();
  }
}

function determineActionForPrepState(expectedState) {
  // never do anything, just wait for somebody to accept, dismiss or reassign the post
  // it is not safe to assume that the post will actually be done if it is not accepted
}

function determineActionForActionState(date, post, expectedState) {
  if (isFifteenMinutesOrMoreAgo(date, post.timestamp)) {
    return function () {
      PostService.startReminderState(function () {
        return console.log(' -- PostTimer: Action state could possibly be done, but we don\'t  know, switching to reminder.');
      });
    };
  } else if (expectedState === STATES.PREPARATION) {
    return function () {
      PostService.justSetState(STATES.IDLE, function () {
        return console.log('-- PostTimer: Temporarily switching to idle to invoke new preparation.');
      });
    };
  }
}

function isFifteenMinutesOrMoreAgo(now, date) {
  return (now - date) >= 15 * 60 * 1000;
}

function determineActionForReminderState(expectedState) {
  switch (expectedState) {
    case STATES.PREPARATION:
      return function () {
        PostService.justSetState(STATES.IDLE, function () {
          return console.log(' -- PostTimer: Temporarily switching from reminder to idle because ' +
            'the next Postler will retrieve the yellow card anyways.');
        });
      };
    case STATES.ACTION:
      return invokePreparationState();
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
  ];
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
