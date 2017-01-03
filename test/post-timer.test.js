var TestUtils = require('./test.utils.js');
var assert = require('assert');
var sinon = require('sinon');
var PostService = require('../services/post.service');
var PostTimer = require('../timers/post.timer');
var STATES = require('../models/states');
var sandbox;
beforeEach(function () {
  sandbox = sinon.sandbox.create();
});
afterEach(function () {
  sandbox.restore();
});

function mockPost(state, timestamp) {
  var post = {
    state: state,
    timestamp: timestamp || new Date(),
    zivi: null
  };
  return sandbox.stub(PostService, 'findCurrentState', function (callback) {
    return callback(post);
  });
}

function justCheckFromToExpected(hour, minute, initialState, targetState, expectedState) {
  mockPost(initialState);
  PostTimer.checkWithTime(
    PostTimer.hourMinuteDateToday(hour, minute),
    function (post, action, expected) {
      expectedState && assert.equal(expected, expectedState, 'expected state');
      assert.equal(post.state, targetState, 'final state');
    }
  );
}

describe('PostTimer', function () {
  describe('from idle', function () {
    it('should stay at 07:35', function () {
      justCheckFromToExpected(7, 35, STATES.IDLE, STATES.IDLE, STATES.IDLE);
    });
    it('should switch to preparation at 10:45', function () {
      justCheckFromToExpected(10, 45, STATES.IDLE, STATES.PREPARATION, STATES.PREPARATION);
    });
    it.skip('should still switch to preparation at 11:05', function () {
      justCheckFromToExpected(11, 5, STATES.IDLE, STATES.PREPARATION, STATES.ACTION);
    });
    it('should switch to preparation at 14:45', function () {
      justCheckFromToExpected(14, 45, STATES.IDLE, STATES.PREPARATION, STATES.PREPARATION);
    });
    it.skip('should still switch to preparation at 15:05', function () {
      justCheckFromToExpected(15, 5, STATES.IDLE, STATES.PREPARATION, STATES.ACTION);
    });
  });
});
