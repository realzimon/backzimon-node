var PostService = require('./post.service');
var ZiviService = require('./zivi.service');
var ConfigService = require('./config.service');
var STATES = require('../models/states');
var TelegramBot = require('node-telegram-bot-api');

const apiKey = ConfigService.getTelegramApiKey();
if(!apiKey) {
  console.error('Starting without a Telegram API key is not supported yet. Please set yours in ./config/local-config.json');
  process.exit(1);
}
var bot = new TelegramBot(apiKey, {
  polling: true
});

var TelegramService = {};

bot.onText(/\/start/, function(msg, match){
  return bot.sendMessage(msg.chat.id, 'To initialise this bot with your profile write: /init <Your first name> (Case sensitive)\n' +
                                      'For help type: /help');
});

bot.onText(/\/help/, function(msg, match){
  return bot.sendMessage(msg.chat.id, 'Following commands are available:\n' +
                                      '/init <First Name> - Initialises this bot to work with your account\n' +
                                      '/postler - Gets the current selected postler zivi for the delivery\n' +
                                      '/accept - Accepts the post request from the bot and increments the post counter by 1\n' +
                                      '/next - Selects the next zivi (chosen randomly and fairly)\n');
});

bot.onText(/\/init (.+)/, function(msg, match){
  ZiviService.findOneByName(match[1] ,function(zivi){
    if(!zivi){
      return bot.sendMessage(msg.chat.id, 'No zivi found for this name (Case sensitive)');
    }
    zivi.chat = msg.chat.id;
    ZiviService.saveZivi(zivi, function(err){
      if(err){
        return bot.sendMessage(msg.chat.id, 'Something went wrong while saving');
      }
      bot.sendMessage(msg.chat.id, 'Updated your status, you will now receive post updates');
    });
  });
});

bot.onText(/\/postler/, function(msg, match){

  isAccountInitialised(msg, function(init) {
    if (!init) {
      return bot.sendMessage(msg.chat.id, 'This account is not initialized with this bot, for more info type /help');
    }
    PostService.findCurrentState(function (post) {
      if (post.state === STATES.IDLE) {
        return bot.sendMessage(msg.chat.id, 'Currently there is no postler selected (state: IDLE)');
      }
      if (!post.zivi) {
        return bot.sendMessage(msg.chat.id, 'Currently there is no postler selected');
      }
      return bot.sendMessage(msg.chat.id, 'The selected postler is: ' + post.zivi.name);
    });
  });

});

bot.onText(/\/accept/, function(msg, match){
  isAccountInitialised(msg, function(init) {
    if (!init) {
      return bot.sendMessage(msg.chat.id, 'This account is not initialized with this bot, for more info type /help');
    }
    PostService.findCurrentState(function (post) {
      if (post.state !== STATES.PREPARATION) {
        return bot.sendMessage(msg.chat.id, 'Post is not in preparing state');
      }
      if (!post.zivi || post.zivi.chat !== msg.chat.id) {
        return bot.sendMessage(msg.chat.id, 'You are not the selected postler');
      }
      PostService.acceptPost(function () {
        bot.sendMessage(msg.chat.id, 'Post accepted');
        PostService.pushPostState();
      });
    })
  });
});

bot.onText(/\/next/, function(msg, match){

  isAccountInitialised(msg, function(init){
    if(!init){
      return bot.sendMessage(msg.chat.id, 'This account is not initialized with this bot, for more info type /help');
    }
    PostService.findCurrentState(function(post){
      if(post.state !== STATES.PREPARATION){
        return bot.sendMessage(msg.chat.id, 'Post is not in preparing state');
      }
      if(!post.zivi || post.zivi.chat !== msg.chat.id){
        return bot.sendMessage(msg.chat.id, 'You are not the selected postler');
      }
      PostService.nextZivi(function(err, zivi){
        bot.sendMessage(msg.chat.id, 'Selected another zivi');
        PostService.pushPostState();
        TelegramService.sendZiviUpdateToUser(zivi, 'You are the selected postler');
      });
    });
  });
});

TelegramService.sendZiviUpdateToUser = function(zivi, message){
  if(zivi.chat === -1){
    return console.log('Zivi ' + zivi.name + ' does not have a valid chat id');
  }
  bot.sendMessage(zivi.chat, message);
};

function isAccountInitialised(msg, callback){
  var chatId = msg.chat.id;
  ZiviService.findAll(function(zivis){
    var init = false;
    zivis.forEach(function(zivi){
      if(zivi.chat === chatId){
        init = true;
      }
    });
    callback(init);
  });
}

module.exports = TelegramService;
