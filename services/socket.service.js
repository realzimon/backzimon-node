var ConfigService = require('./config.service');

if (process.env.zimonTest) {
  module.exports = {
    writeToSocket: function (channel, data) {
      //no-op for tests
    }
  };
  return;
}

var io = require('socket.io')(ConfigService.getSocketPort());

var SocketService = {};

function getSocket() {
  //noinspection JSUnresolvedVariable
  return io.sockets;
}

SocketService.writeToSocket = function (channel, data) {
  getSocket().emit(channel, data);
};

module.exports = SocketService;
