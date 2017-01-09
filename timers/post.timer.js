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
  initTimes(date);
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
      action = determineActionForIdleState(date, post, expectedState);
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
      TelegramService.sendPostlerPromptTo(post.zivi);
      return console.log(' -- PostTimer: Changed to preparation state.');
    });
  };
};
function determineActionForIdleState(date, post, expectedState) {
  switch (expectedState) {
    case STATES.PREPARATION:
    case STATES.ACTION:
      if (isTimestampInFutureAndLogError(date, post) ||
        isFifteenMinutesOrMoreAgo(date, post.timestamp)) {
        return invokePreparationState();
      }
  }
}

function isTimestampInFutureAndLogError(date, post) {
  if (post.timestamp > date) {
    console.error(' ## Post timestamp is in the future. Either somebody here is a time traveller, ' +
      'or the system clock has changed. Resetting timestamp.');
    post.timestamp = new Date('1970-01-01 13:37:04Z');
    PostService.attemptSave(post, function (err) {
      console.log(' -- saved reset post timestamp, err:', err);
      console.log(' -- new post data:', post);
    })
  }
}

function determineActionForPrepState(expectedState) {
  // never do anything, just wait for somebody to accept, dismiss or reassign the post
  // it is not safe to assume that the post will actually be done if it is not accepted
}

function determineActionForActionState(date, post, expectedState) {
  var stateStartedMoreThan15MinutesAgo = isFifteenMinutesOrMoreAgo(date, post.timestamp);
  if (isTimestampInFutureAndLogError(date, post) || stateStartedMoreThan15MinutesAgo) {
    return function () {
      PostService.startReminderState(function (err, post) {
        if(!err){
          TelegramService.sendYellowCardReminder(post.zivi);
        }
        return console.log(' -- PostTimer: Action state could possibly be done, but we don\'t  know, switching to reminder.');
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

function initTimes(date) {
  TIME_FOR_PREP = [
    PostTimer.hourMinuteDateOnDate(date, 10, 45),
    PostTimer.hourMinuteDateOnDate(date, 14, 45)
  ];
  TIME_FOR_ACTION = [
    PostTimer.hourMinuteDateOnDate(date, 11, 0),
    PostTimer.hourMinuteDateOnDate(date, 15, 0)
  ];
  TIME_FOR_REMINDER = [
    PostTimer.hourMinuteDateOnDate(date, 11, 15),
    PostTimer.hourMinuteDateOnDate(date, 15, 15)
  ];
  TIME_FOR_IDLE = [
    PostTimer.hourMinuteDateOnDate(date, 11, 30),
    PostTimer.hourMinuteDateOnDate(date, 15, 30)
  ];
}

PostTimer.hourMinuteDateToday = function (hours, minutes) {
  return PostTimer.hourMinuteDateOnDate(new Date(), hours, minutes);
};

PostTimer.hourMinuteDateOnDate = function (initial, hours, minutes) {
  return new Date(initial.getFullYear(), initial.getMonth(), initial.getDate(), hours, minutes, 0, 0)
};

function isWeekend(date) {
  return date.getDay() == /* Saturday */ 6 || date.getDay() == /* Sunday */ 0;
}

initTimes(new Date());
PostService.pushPostState();

module.exports = PostTimer;
