var shuffle = require('shuffle-array');
const STATES = require('../config/states');
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
  if (isWeekend(new Date())) {
    // we're outta here, no work today
    return;
  }
  initTimes();

  PostService.findCurrentState(function(post){
    var expectedState = getStateForTime(new Date());
    var action = determineAction(post.state, expectedState);
    if(!action){
      return;
    }
    //Execute given action
    console.info(' -- PostTimer: Changing state from ', post.state, ' to ', expectedState, ' at ', new Date());
    action();
  });

};

function determineAction(currentState, expectedState){
  if(currentState === expectedState){
    return;
  }
  var action;
  switch (currentState){
    case STATES.IDLE:
      action = determineActionForIdleState(expectedState);
      break;
    case STATES.PREPERATION:
      action = determineActionForPrepState(expectedState);
      break;
    case STATES.ACTION:
      action = determineActionForActionState(expectedState);
      break;
    case STATES.REMINDER:
      action = determineActionForReminderState(expectedState);
      break;
  }
  return action;
}

function determineActionForIdleState(expectedState){
  switch (expectedState){
    case STATES.PREPERATION:
      return function(){
        PostService.startPreparationState(function(err, post){
          TelegramService.sendZiviUpdateToUser(post.zivi, 'You are the selected postler');
          return console.log(' -- PostTimer: Changed to preparation state.');
        });
      };
    case STATES.ACTION:
    case STATES.REMINDER:
      // If state is currently in IDLE State and nobody was selected
      // in the preparation state, then we leave it in the IDLE state
      // --> Nothing to do
      return;
  }
}

function determineActionForPrepState(expectedState){
  switch(expectedState){
    //Expected state change, we credit the user if he did not accept it automatically
    case STATES.ACTION:
      return function(){
        PostService.acceptPost(function(err, zivi){
          TelegramService.sendZiviUpdateToUser(zivi, 'You automatically accepted the offer, because you did not respond.');
          return console.log(' -- PostTimer: Zivi ', zivi.name, ' did not accept the offer, cruelly accepting for them.');
        });
      };
    //If no user accepted the offer, we just switch it to idle, as if nothing happened
    case STATES.REMINDER:
    case STATES.IDLE:
      return function(){
        PostService.justSetState(STATES.IDLE, function(){
          return console.log(' -- PostTimer: Preparation state ended without action state being expected.');
        });
      };
  }
}

function determineActionForActionState(expectedState){
  switch(expectedState){
    case STATES.REMINDER:
      return function(){
        PostService.startReminderState(function(){
          return console.log(' -- PostTimer: Action state could possibly be don,but we don\'t  know, switching to reminder.');
        });
      };
    case STATES.PREPERATION:
      return function(){
        PostService.findCurrentState(function(post){
          if((post.timestamp < TIME_FOR_PREP[0] || post.timestamp >= TIME_FOR_ACTION[0]) && (post.timestamp < TIME_FOR_PREP[1] || post.timestamp >= TIME_FOR_ACTION[1])){
            PostService.startPreparationState(function(err, zivi){
              TelegramService.sendZiviUpdateToUser(zivi, 'You are the selected Postler!');
              return console.log('-- PostTimer: Starting preparation state right out of action because we don\'t care apparently.');
            });
          }
        });
      };
    case STATES.IDLE:
      return function(){
        PostService.justSetState(STATES.IDLE, function(){
          return console.log('-- PostTimer: Switching from action to idle because reminders are for beginners.');
        });
      };
  }
}

function determineActionForReminderState(expectedState){
  switch(expectedState){
    case STATES.ACTION:
    case STATES.IDLE:
      return function(){
        PostService.justSetState(STATES.IDLE, function(){
          return console.log(' -- PostTimer: Switching from reminder to idle state because who needs the yellow card anyways.');
        });
      };
    case STATES.PREPERATION:
      return function(){
        PostService.startPreparationState(function(post){
          TelegramService.sendZiviUpdateToUser(post.zivi, 'You are the selected postler');
          return console.log(' -- PostTimer: Switching from reminder to preparation state because who needs the yellow card anyways.');
        });
      };
  }
}

function getStateForTime(date){
  if(timeForIdle(date)){
    return STATES.IDLE;
  } else if(timeForAction(date)) {
    return STATES.ACTION;
  } else if(timeForPrep(date)){
    return STATES.PREPERATION;
  } else {
    return STATES.REMINDER;
  }
}

function timeForPrep(date){
  return (date >= TIME_FOR_PREP[0] && date < TIME_FOR_ACTION[0]) || (date >= TIME_FOR_PREP[1] && date < TIME_FOR_ACTION[1]);
}

function timeForIdle(date){
  return date < TIME_FOR_PREP[0] || date > TIME_FOR_IDLE[1] || (date >= TIME_FOR_IDLE[0] && date < TIME_FOR_PREP[1]);
}

function timeForAction(date){
  return (date >= TIME_FOR_ACTION[0] && date < TIME_FOR_REMINDER[0]) || (date >= TIME_FOR_ACTION[1] && date < TIME_FOR_REMINDER[1]);
}

function initTimes(){

  TIME_FOR_PREP = [
    createDateWithHoursAndMinutes(10, 45),
    createDateWithHoursAndMinutes(14, 45)
  ];

  TIME_FOR_ACTION = [
    createDateWithHoursAndMinutes(11, 0),
    createDateWithHoursAndMinutes(15, 0)
  ];

  TIME_FOR_REMINDER = [
    createDateWithHoursAndMinutes(11, 15),
    createDateWithHoursAndMinutes(15, 15)
  ];

  TIME_FOR_IDLE = [
    createDateWithHoursAndMinutes(11, 30),
    createDateWithHoursAndMinutes(15, 30)
  ]
}

function createDateWithHoursAndMinutes(hours, minutes){
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
}

function isWeekend(date) {
  return date.getDay() == /* Saturday */ 6 || date.getDay() == /* Sunday */ 0;
  // fuck you JavaScript for Sunday being the first day of week,
  // ISO-8601 says otherwise you're entirely wrong
  // Actually Js is right with having the sunday == 0, take a closer look at the norm
}

const FIVE_SECONDS = 1000;
setInterval(PostTimer.checkAndNotify, FIVE_SECONDS);
PostService.pushPostState();

module.exports = PostTimer;
