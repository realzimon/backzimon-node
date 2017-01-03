var mongoose = require('mongoose');
var ConfigService = require('../services/config.service');

//See: https://github.com/Automattic/mongoose/issues/4291 for more details on this line
mongoose.Promise = global.Promise;

mongoose.connect(ConfigService.getMongoUrl());
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

//Model definitions
var Quote = mongoose.model('quote', mongoose.Schema({
  text: String,
  count: {
    type: Number,
    min: 0
  }
}));

var Zivi = mongoose.model('zivi', mongoose.Schema({
  name: String,
  name_mx: String,
  post_count: {
    type: Number,
    min: 0
  },
  color: String,
  colorHex: String,
  picture: String,
  first: Number,
  order: Number,
  chat: Number
}));

var Post = mongoose.model('post', mongoose.Schema({
  state: String,
  timestamp: Date,
  zivi: Object
}));

var models = {
  Quote: Quote,
  Zivi: Zivi,
  Post: Post
};

module.exports = models;
