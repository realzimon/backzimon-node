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
setInterval(setPostInterval, 86400000);
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

function shuffleAndUpdateZivis() {
  models.Zivi.find({}).then(function (result) {
    shuffle(result);
    result[0].first += 1;
    for (var i = 0; i < result.length; i++) {
      result[i].order = i + 1;
      result[i].save();
    }
  });
}

function setPostInterval() {
  var now = new Date();
  // don't do anything on the weekends
  if (now.getDay() == 6 || now.getDay() == 0) {
    return;
  }

  function millisUntilTime(hour, minute) {
    var millis = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0) - now;
    if (millis < 0) { //already past this time today, set for tomorrow
      millis = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0, 0) - now;
    }
    return millis;
  }

  setTimeout(changeStateToPrep, millisUntilTime(10, 45));
  setTimeout(changeStateToPrep, millisUntilTime(14, 45));
  setTimeout(changeStateToReminder, millisUntilTime(11, 10));
  setTimeout(changeStateToReminder, millisUntilTime(15, 10));
}

function changeStateToPrep() {
  models.Post.findOne({}).then(function (post) {
    //This should not happen, if everybody watches their shit
    //TODO: Uncomment
    /*if(post.state !== 'IDLE'){
     return console.log('Somebody missed the accept the post offer');
     }*/
    models.Zivi.find({
      name: {
        $ne: post.zivi ? post.zivi.name : ''
      }
    }).then(function (zivis) {
      shuffle(zivis);
      var chosenOne = zivis[0];

      post.state = STATES.PREPERATION;
      post.timestamp = new Date();
      post.zivi = chosenOne;

      post.save(function (err, result) {
        if (err) {
          return console.log('Something wrent wrong:', err);
        }
        sendPostUpdate();
      });

    });
  });
}

function changeStateToReminder() {
  models.Post.findOne({}).then(function (post) {
    if (post.state !== STATES.ACTION && post.state !== STATES.PREPERATION) {
      return console.log('Something went terribly wrong');
    }
    //User has accepted the request and is now back (probably) or forgot to accept the offer
    models.Zivi.findOne({name: post.zivi.name}).then(function (zivi) {
      zivi.post_count += 1;
      zivi.save(function (err) {
        if (err) {
          return console.log('Something went wrong on user update', err);
        }
        post.state = STATES.REMINDER;
        post.timestamp = new Date();
        post.save(function (err) {
          if (err) {
            return console.log('Something went wrong on post update', err);
          }
          sendPostUpdate();
        });
      });
    });

  });
}

function changeStateToIdle() {
  models.Post.findOne({}).then(function (post) {
    if (post.state !== STATES.REMINDER) {
      return console.log('Something went terribly wrong');
    }
    post.state = STATES.IDLE;
    post.timestamp = new Date();
    post.save(function (err) {
      if (err) {
        return console.log('Something went wrong on post update', err);
      }
      sendPostUpdate();
    });
  });
}

function sendPostUpdate() {
  io.sockets.emit('post', {
    update: 'state'
  });
}
