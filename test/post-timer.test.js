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

  describe('from preparation', function () {
    it('should stay at 07:35', function () {
      justCheckFromToExpected(7, 35, STATES.PREPARATION, STATES.PREPARATION, STATES.IDLE);
    });
    it('should stay at 10:50', function () {
      justCheckFromToExpected(10, 50, STATES.PREPARATION, STATES.PREPARATION, STATES.PREPARATION);
    });
    it('should stay at 11:00', function () {
      justCheckFromToExpected(11, 0, STATES.PREPARATION, STATES.PREPARATION, STATES.ACTION);
    });
    it('should stay at 14:50', function () {
      justCheckFromToExpected(14, 50, STATES.PREPARATION, STATES.PREPARATION, STATES.PREPARATION);
    });
    it('should stay at 15:00', function () {
      justCheckFromToExpected(15, 0, STATES.PREPARATION, STATES.PREPARATION, STATES.ACTION);
    });
  });

  describe('from action', function () {
    it('should stay if last state change is less than 15 minutes ago', function () {
      const date = PostTimer.hourMinuteDateToday(11, 20);
      mockPost(STATES.ACTION, date);
      PostTimer.checkWithTime(
        date,
        function (post, action, expected) {
          assert.equal(expected, STATES.REMINDER, 'expected state');
          assert.equal(post.state, STATES.ACTION, 'final state');
        }
      );
    });
    it('should correctly subtract minutes', function () {
      var now = PostTimer.hourMinuteDateToday(10, 5);
      var fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);
      assert.equal(now - fifteenMinutesAgo, 15 * 60 * 1000, 'minute subtraction does not work');
    });
    it('should change to reminder if last state change is 15 minutes ago', function () {
      const date = PostTimer.hourMinuteDateToday(11, 5);
      mockPost(STATES.ACTION, new Date(date - 16 * 60 * 1000));
      PostTimer.checkWithTime(
        date,
        function (post, action, expected) {
          assert.equal(expected, STATES.ACTION, 'expected state');
          assert.equal(post.state, STATES.REMINDER, 'final state');
        }
      );
    })
  });


  describe('from reminder', function () {
    it('should stay at reminder at 12:00', function () {
      justCheckFromToExpected(12, 0, STATES.REMINDER, STATES.REMINDER, STATES.IDLE);
    });
    it('should move to idle and then preparation at 14:45', function () {
      justCheckFromToExpected(14, 45, STATES.REMINDER, STATES.IDLE, STATES.PREPARATION);
      sandbox.restore();
      justCheckFromToExpected(14, 45, STATES.IDLE, STATES.PREPARATION, STATES.PREPARATION);
    });
    it('should move to idle and then preparation at 15:05', function () {
      justCheckFromToExpected(15, 5, STATES.REMINDER, STATES.PREPARATION, STATES.ACTION);
    });
    it('should stay at reminder at 15:15', function () {
      justCheckFromToExpected(15, 15, STATES.REMINDER, STATES.REMINDER, STATES.REMINDER);
    });
    it('should stay at reminder at 17:00', function () {
      justCheckFromToExpected(17, 0, STATES.REMINDER, STATES.REMINDER, STATES.IDLE);
    });
  });
});
