var io = require('socket.io')(4001);
var shuffle = require('shuffle-array');
var models = require('../../models/index');
const STATES = require('../../config/states');

//Seconds when the zivis should change
const MAX_TIME = 600;
//Every ten minutes update the client
var remaining = MAX_TIME;
setInterval(countDown, 1000);

//First load shuffle the zivis and set the order
shuffleAndUpdateZivis();

//Set the timeout on the first start and then every day after (86400000)
setPostInterval();
setInterval(setPostInterval, 20000);
var lastPostZivi;

function countDown() {
  remaining--;
  io.sockets.emit('timer', {
    remaining: remaining
  });
  if (remaining === 0) {
    remaining = MAX_TIME;
    shuffleAndUpdateZivis();
  }
}

function shuffleAndUpdateZivis(){
  models.Zivi.find({}).then(function (result) {
    shuffle(result);
    result[0].first += 1;
    for(var i = 0; i < result.length; i++){
      result[i].order = i + 1;
      result[i].save();
    }
  });
}

function setPostInterval(){

  var now = new Date();
  //dont do anything on the weekends
  if(now.getDay() == 6 || now.getDay() == 0){
    return;
  }

  var millisTill10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0) - now;
  var millisTill14 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0) - now;
  var millisTill1115 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 15, 0, 0) - now;
  var millisTill1515 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 15, 0, 0) - now;
  var millisTill1130 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0, 0) - now;
  var millisTill1530 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0, 0) - now;

  //TODO: Remove
  var test = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds() + 5, 0) - now;

  //If the milliseconds are lower then 0 the time already passed, we have to set the intervall for the next day
  if(millisTill10 < 0){
    millisTill10 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0, 0) - now;
  }
  if(millisTill14 < 0){
    millisTill14 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0, 0) - now;
  }
  if(millisTill1115 < 0){
    millisTill1115 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 15, 0, 0) - now;
  }
  if(millisTill1515 < 0){
    millisTill1515 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 15, 0, 0) - now;
  }
  if(millisTill1130 < 0){
    millisTill1130 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 30, 0, 0) - now;
  }
  if(millisTill1530 < 0){
    millisTill1530 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 30, 0, 0) - now;
  }

  setTimeout(changeStateToPrep, millisTill10);
  setTimeout(changeStateToPrep, millisTill14);

  setTimeout(changeStateToReminder, millisTill1115);
  setTimeout(changeStateToReminder, millisTill1515);

  setTimeout(changeStateToIdle, millisTill1130);
  setTimeout(changeStateToIdle, millisTill1530);

  //TODO: Remove
  setTimeout(changeStateToPrep, test);
  //5 seconds later
  setTimeout(changeStateToReminder, test + 5000);
  setTimeout(changeStateToIdle, test + 10000);

}

function changeStateToPrep(){
  models.Post.findOne({}).then(function(post){
    //This should not happen, if everybody watches their shit
    //TODO: Uncomment
    /*if(post.state !== 'IDLE'){
      return console.log('Somebody missed the accept the post offer');
    }*/
    models.Zivi.find({}).then(function(zivis){
      shuffle(zivis);
      var chosenOne = zivis[0];

      post.state = STATES.PREPERATION;
      post.timestamp = new Date();
      post.zivi = chosenOne;

      post.save(function(err, result){
        if(err){
          return console.log('Something wrent wrong:', err);
        }
        sendPostUpdate();
      });

    });
  });
}

function changeStateToReminder(){
  models.Post.findOne({}).then(function(post){
    if(post.state !== STATES.ACTION && post.state !== STATES.PREPERATION){
      return console.log('Something went terribly wrong');
    }
    //User has accepted the request and is now back (probably) or forgot to accept the offer
    models.Zivi.findOne({name: post.zivi.name}).then(function(zivi){
      zivi.post_count += zivi.post_count + 1;
      zivi.save(function(err){
        if(err){
          return console.log('Something went wrong on user update', err);
        }
        post.state = STATES.REMINDER;
        post.timestamp = new Date();
        post.save(function(err){
          if(err){
            return console.log('Something went wrong on post update', err);
          }
          sendPostUpdate();
        });
      });
    });

  });
}

function changeStateToIdle(){
  models.Post.findOne({}).then(function(post){
    if(post.state !== STATES.REMINDER){
      return console.log('Something went terribly wrong');
    }
    post.state = STATES.IDLE;
    post.timestamp = new Date();
    post.zivi = null;
    post.save(function(err){
      if(err){
        return console.log('Something went wrong on post update', err);
      }
      sendPostUpdate();
    });
  });
}

function sendPostUpdate(){
  io.sockets.emit('post', {
    update: 'state'
  });
}