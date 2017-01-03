// NOTE: This service is solely intended for testing, do not use in Production code.
process.env.zimonTest = true;

var assert = require('assert');
var sinon = require('sinon');

var mongoose = require('mongoose');
sinon.stub(mongoose);
mongoose.connection = {
  on: function () {
  }
};

var ZiviService = require('../services/zivi.service.js');
sinon.stub(ZiviService, 'findAll', function (callback) {
  callback && callback([{name: 'lel', post_count: 0}]);
});

var PostService = require('../services/post.service.js');
sinon.stub(PostService, 'pushPostState');
sinon.stub(PostService, 'attemptSave', function (post, callback) {
  callback && callback(null, post);
});

var TestUtils = {};

module.exports = TestUtils;
