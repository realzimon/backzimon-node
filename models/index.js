var mongoose = require('mongoose');

//See: https://github.com/Automattic/mongoose/issues/4291 for more details on this line
mongoose.Promise = global.Promise;

mongoose.connect('mongodb://127.0.0.1/zimon');
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
  first: 0,
  order: 0
}));

var models = {
  Quote: Quote,
  Zivi: Zivi
};

module.exports = models;
