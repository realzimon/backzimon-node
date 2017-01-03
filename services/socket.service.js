var ConfigService = require('./config.service');
var io = require('socket.io')(ConfigService.getSocketPort());

var SocketService = {};

SocketService.getSocket = function () {
  //noinspection JSUnresolvedVariable
  return io.sockets;
};

SocketService.writeToSocket = function (channel, data) {
  SocketService.getSocket().emit(channel, data);
};

module.exports = SocketService;
