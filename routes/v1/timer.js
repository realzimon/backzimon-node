var io = require('socket.io')(4001);

//Seconds when the zivis should change
const MAX_TIME = 120;
//Every ten minutes update the client 600000
var remaining = MAX_TIME;
setInterval(countDown, 1000);

function countDown(){
  remaining--;
  io.sockets.emit('timer', {
    remaining: remaining
  });
  if(remaining === 0){
    remaining = MAX_TIME;
  }
}
