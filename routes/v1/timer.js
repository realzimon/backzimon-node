var io = require('socket.io')(4001);
var shuffle = require('shuffle-array');
var models = require('../../models/index');

//Seconds when the zivis should change
const MAX_TIME = 600;

//First load shuffle the zivis and set the order
shuffleAndUpdateZivis();

//Every ten minutes update the client 600000
var remaining = MAX_TIME;
setInterval(countDown, 1000);

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
