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

const ziviSchema = {
  name: String,
  name_mx: String,
  post_count: {
    type: Number,
    min: 0,
    default: 0
  },
  color: String,
  colorHex: String,
  picture: String,
  order: Number,
  chat: Number,
  addresses: Array
};
var Zivi = mongoose.model('zivi', mongoose.Schema(ziviSchema));
var DeletedZivi = mongoose.model('ripzivi', mongoose.Schema(ziviSchema));

var Post = mongoose.model('post', mongoose.Schema({
  state: String,
  timestamp: Date,
  zivi: Object
}));

var Flade = mongoose.model('flade', mongoose.Schema({
  text: String,
  timestamp: Date
}));

var models = {
  Quote: Quote,
  Zivi: Zivi,
  DeletedZivi: DeletedZivi,
  Post: Post,
  Flade: Flade
};

module.exports = models;
