var io = require('socket.io')(4001);

var SocketService = {};

SocketService.getSocket = function () {
  //noinspection JSUnresolvedVariable
  return io.sockets;
};

SocketService.writeToSocket = function (channel, data) {
  SocketService.getSocket().emit(channel, data);
};

module.exports = SocketService;
