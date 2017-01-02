var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(' -- insert api key --', {
  polling: true
});

var PostService = require('./../services/post.service');
var ZiviService = require('./../services/zivi.service');

var TelegramService = {};

bot.onText(/\/postler/, function(msg, match){
  PostService.findCurrentState(function(post){
    if(post.state === STATES.IDLE){
      return bot.sendMessage(msg.chat.id, 'Currently there is no postler selected (state: IDLE)');
    }
    return bot.sendMessage(msg.chat.id, 'The selected postler is: ' + post.zivi.name);
  });
});

bot.onText(/\/init (.+)/, function(msg, match){
  ZiviService.findOneByName(match[1] ,function(zivi){
    if(!zivi){
      return bot.sendMessage(msg.chat.id, 'No zivi found for this name (Case Sensitive)');
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

bot.onText(/\/accept/, function(msg, match){
  PostService.findCurrentState(function(post){
    if(post.state !== STATES.PREPERATION){
      //return bot.sendMessage(msg.chat.id, 'Post is not in preparing state');
    }
    if(post.zivi.chat !== msg.chat.id){
      //return bot.sendMessage(msg.chat.id, 'You are not the selected postler');
    }
    PostService.acceptPost(function(){
      bot.sendMessage(msg.chat.id, 'Post accepted');
      PostService.pushPostState();
    });
  })
});

bot.onText(/\/next/, function(msg, match){

  PostService.findCurrentState(function(post){
    if(post.state !== STATES.PREPERATION){
      return bot.sendMessage(msg.chat.id, 'Post is not in preparing state');
    }
    if(post.zivi.chat !== msg.chat.id){
      return bot.sendMessage(msg.chat.id, 'You are not the selected postler');
    }
    PostService.nextZivi(function(err, zivi){
      bot.sendMessage(msg.chat.id, 'Selected another zivi');
      PostService.pushPostState();
      TelegramService.sendZiviUpdateToUser(zivi, 'You are the selected postler');
    });
  })
});

TelegramService.sendZiviUpdateToUser = function(zivi, message){
  if(zivi.chat === -1){
    return console.log('Zivi ' + zivi.name + ' does not have a valid chat id');
  }
  bot.sendMessage(zivi.chat, message);
};

module.exports = TelegramService;
