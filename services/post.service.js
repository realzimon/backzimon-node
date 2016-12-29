const STATES = require('../config/states');
var models = require('../models/index');
var ZiviService = require('./zivi.service');

var PostService = {};

PostService.findCurrentState = function (callback) {
  models.Post.findOne({}).then(function (post) {
    return callback(post);
  });
};

PostService.attemptSave = function (post, callback) {
  post.save(function (err) {
    if (!!callback) {
      callback(err);
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
    if (post.state !== STATES.PREPERATION) {
      return callback && callback('Can only accept in preparation state, is: ' + post.state);
    }
    PostService.setStateOn(post, STATES.ACTION, function (err) {
      if (err) {
        return callback && callback('Unable to set state');
      } else {
        PostService.incrementPostCount(post, function (err) {
          if (err) {
            return callback && callback('Unable to credit Zivi');
          } else {
            return callback && callback();
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
  ZiviService.getByName(post.zivi.name, function (zivi) {
    zivi.post_count += 1;
    zivi.save(callback);
  });
};

PostService.dismissReminder = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.REMINDER) {
      return callback('Cannot dismiss reminder when not in reminder state, is: ' + post.state);
    } else {
      PostService.setStateOn(post, STATES.IDLE, callback);
    }
  });
};

PostService.nextZivi = function (callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.PREPERATION) {
      return callback('Expected preparation state, but is: ' + post.state);
    }
    PostService.selectPostlerFairly(post, function (selectedZivi) {
      post.zivi = selectedZivi;
      PostService.attemptSave(post, callback);
    });
  });
};

PostService.selectPostlerFairly = function (post, callback) {
  ZiviService.findAllBut(post.zivi, function (zivis) {
    shuffle(zivis);
    callback(zivis[0]);
  })
};

return PostService;
