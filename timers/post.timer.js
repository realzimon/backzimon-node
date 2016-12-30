var shuffle = require('shuffle-array');
const STATES = require('../config/states');
var models = require('../models/index');
var PostService = require('./../services/post.service.js');

var PostTimer = {};

PostTimer.checkAndNotify = function () {
  if (isWeekend(new Date())) {
    // we're outta here, no work today
    return;
  }
  PostService.findCurrentState(function (post) {
    switch (post.state) {
      case STATES.IDLE:
        checkIdleState(post);
        break;
      case STATES.PREPERATION:
        checkPreparationState(post);
        break;
      case STATES.ACTION:
        checkActionState(post);
        break;
      case STATES.REMINDER:
        checkReminderState(post);
        break;
      default:
        console.error(' ## unknown post state: ', post.state);
    }
  });
};

function isWeekend(date) {
  return date.getDay() == /* Saturday */ 6 || date.getDay() == /* Sunday */ 0;
  // fuck you JavaScript for Sunday being the first day of week,
  // ISO-8601 says otherwise you're entirely wrong
}

function pushStateOrLog(prefix) {
  return function (err) {
    if (err) {
      console.error(' ## postchecker.service | ', prefix ? prefix : 'error', ' : ', err);
    }
  }
}

function checkIdleState(post) {
  // wait for preparation for post
  if (shouldPreparePost(post)) {
    PostService.startPreparationState(pushStateOrLog('idle -> prepare'));
  }
}

function checkPreparationState(post) {
  // no-op, wait for user input
}

function checkActionState(post) {
  // wait for the Zivi to return for fifteen minutes,
  // then ask him to  confirm the return of the yellow card
  if (lastActionMoreThanMinutesAgo(post, 15)) {
    PostService.startReminderState(pushStateOrLog('action -> reminder'));
  }
}

function checkReminderState(post) {
  // no-op, wait for user input
}

function shouldPreparePost(post) {
  return timeIsAfterButLastActionIsBefore(post, 10, 45) ||
    timeIsAfterButLastActionIsBefore(post, 14, 45);
}

const A_MINUTE_IN_MILLIS = 60 * 1000;
function lastActionMoreThanMinutesAgo(post, minutes) {
  var now = new Date();
  return (now - post.timestamp) > (minutes * A_MINUTE_IN_MILLIS);
}

function timeIsAfterButLastActionIsBefore(post, hour, minute) {
  return timeIsAfterHM(hour, minute) && lastActionBeforeHM(post, hour, minute);
}

function timeIsAfterHM(hour, minute) {
  return isAfterHM(new Date(), hour, minute);
}

function isAfterHM(date, hour, minute) {
  return date.getHours() > hour || (date.getHours() == hour && date.getMinutes() > minute);
}

function lastActionBeforeHM(post, hour, minute) {
  return isBeforeHM(post.timestamp, hour, minute);
}

function isBeforeHM(date, hour, minute) {
  return date.getHours() < hour || (date.getHours() == hour && date.getMinutes() < minute);
}

const TEN_SECONDS = 10 * 1000;
setInterval(PostTimer.checkAndNotify, TEN_SECONDS);
PostService.pushPostState();

module.exports = PostTimer;
