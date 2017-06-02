var shuffle = require('shuffle-array');

const STATES = require('../models/states');
var models = require('../models/index');
var ZiviService = require('./zivi.service');
var SocketService = require('./socket.service');


var PostService = {};

PostService.findCurrentState = function (callback) {
  models.Post.findOne({}).then(function (post) {
    return callback(post);
  });
};

PostService.attemptSave = function (post, callback) {
  post.save(function (err, post) {
    if (err) {
      callback(err);
    }
    if (!err) {
      PostService.pushPostState();
      callback(null, post);
    }
  });
};

PostService.setStateOn = function (post, state, callback) {
  post.state = state;
  post.timestamp = new Date();
  PostService.attemptSave(post, callback);
};

PostService.setStateOnOrLog = function (post, state) {
  PostService.setStateOn(post, state, function (err) {
    console.error(' ## Failed to save post state: ', post, state, err);
  })
};

PostService.justSetState = function (state, callback) {
  PostService.findCurrentState(function (post) {
    PostService.setStateOn(post, state, callback);
  });
};

PostService.acceptPost = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.PREPARATION) {
      return callback && callback('Can only accept in preparation state, is: ' + post.state);
    }
    PostService.setStateOn(post, STATES.ACTION, function (err, post) {
      if (err) {
        return callback && callback('Unable to set state');
      } else {
        PostService.incrementPostCount(post, function (err, post) {
          if (err) {
            return callback && callback('Unable to credit Zivi');
          } else {
            return callback && callback(null, post);
          }
        });
      }
    });
  })
};

PostService.incrementPostCount = function (post, callback) {
  if (!post.zivi) {
    return;
  }
  ZiviService.findOneByName(post.zivi.name, function (zivi) {
    zivi.post_count += 1;
    ZiviService.saveZivi(zivi, callback);
  });
};

PostService.dismissReminder = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.REMINDER) {
      return callback && callback('Cannot dismiss reminder when not in reminder state, is: ' + post.state);
    } else {
      PostService.setStateOn(post, STATES.IDLE, callback);
    }
  });
};

PostService.nextZivi = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.PREPARATION) {
      return callback && callback('Expected preparation state, but is: ' + post.state);
    }
    PostService.selectPostlerFairly(post, callback);
  });
};

PostService.selectPostlerFairly = function (post, callback) {
  ZiviService.findAllBut(post.zivi, function (zivis) {
    var fairArray = [];
    //Determine max post count of the zivis
    var maxPostCount = -1;
    zivis.forEach(function (zivi) {
      if (zivi.post_count > maxPostCount) {
        maxPostCount = zivi.post_count;
      }
    });
    /*
     Create an array that has maxPostCount - zivi.post_count + 1 elements
     of each zivi. Which will basically represent a zivi with a lower post count
     in a higher probability than a zivi with a higher post count
     e.g: zivi1.post_count: 3, zivi2.post_count: 1, zivi3.post_count: 2
     fairArray = [zivi1, zivi2, zivi2, zivi2, zivi3, zivi3]
     */
    zivis.forEach(function (zivi) {
      for (var i = 0; i < maxPostCount - zivi.post_count + 1; i++) {
        fairArray.push(zivi);
      }
    });
    shuffle(fairArray);
    post.zivi = fairArray[0];
    console.log(' -- PostService: Selected', post.zivi.name);
    PostService.attemptSave(post, callback);
  });
};

PostService.forcePostler = function (zivi, callback) {
  PostService.findCurrentState(function (post) {
    post.zivi = zivi;
    PostService.setStateOn(post, STATES.PREPARATION, callback);
  });
};

PostService.startReminderState = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.ACTION && post.state !== STATES.PREPARATION) {
      return callback && callback('Invalid state, is: ' + post.state);
    } else {
      PostService.setStateOn(post, STATES.REMINDER, callback);
    }
  });
};

PostService.startPreparationState = function (callback) {
  PostService.findCurrentState(function (post) {
    post.state = STATES.PREPARATION;
    PostService.selectPostlerFairly(post, callback);
  });
};

PostService.pushPostState = function () {
  SocketService.writeToSocket('post', {
    update: 'state'
  });
};

module.exports = PostService;
