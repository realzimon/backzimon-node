var io = require('socket.io')(4001);
var shuffle = require('shuffle-array');
var models = require('../../models/index');

//Seconds when the zivis should change
const MAX_TIME = 600;
//Every ten minutes update the client
var remaining = MAX_TIME;
setInterval(countDown, 1000);

//First load shuffle the zivis and set the order
shuffleAndUpdateZivis();

const STATES = {
  IDLE: 'IDLE',
  PREPERATION: 'PREPERATION',
  ACTION: 'ACTION',
  REMINDER: 'REMINDER'
};
//Set the timeout on the first start and then every day after
setPostInterval();
setInterval(setPostInterval, 86400000);

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
  var millisTill11 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0) - now;
  var millisTill15 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0, 0) - now;

  //TODO: Remove
  var test = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds() + 5, 0) - now;

  //If the milliseconds are lower then 0 the time already passed, we have to set the intervall for the next day
  if(millisTill11 < 0){
    millisTill11 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0, 0, 0) - now;
  }
  if(millisTill15 < 0){
    millisTill15 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0, 0, 0) - now;
  }
  //TODO: Remove
  if(test < 0 ){
    test = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, now.getHours(), now.getMinutes(), now.getSeconds() + 5, 0) - now;
  }

  setTimeout(changeState, millisTill11);
  setTimeout(changeState, millisTill15);

  //TODO: Remove
  setTimeout(changeState, test);

}

function changeState(){
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
        io.sockets.emit('post', {
          update: 'state'
        });
      });

    });
  });
}