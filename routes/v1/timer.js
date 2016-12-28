var io = require('socket.io')(4001);

//Seconds when the zivis should change
const MAX_TIME = 5;
//Every ten minutes update the client 600000
var remaining = MAX_TIME;
setInterval(countDown, 1000);

io.on('connection', function (socket) {
  io.emit('timer', {
    remaining: remaining
  });

  socket.on('remaining', function (from, msg) {
    io.emit('timer', {
      remaining: remaining
    });
  });

});

function countDown(){
  remaining--;
  if(remaining === 0){
    io.sockets.emit('timer', {
      refresh: true
    });
    remaining = MAX_TIME;
  }
}
