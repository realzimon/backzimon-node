var PostService = require('./post.service');
var ZiviService = require('./zivi.service');
var ConfigService = require('./config.service');
var STATES = require('../models/states');
const apiKey = ConfigService.getTelegramApiKey();
var TelegramService = require('./telegram-dummy.service');
if (!apiKey || process.env.zimonTest) {
  console.warn('Using dummy Telegram service, i.e. ignoring all calls.');
  console.warn('Set an API key in ./config/local-config.json to change this.');
  module.exports = TelegramService;
  return;
}

var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(apiKey, {
  polling: true
});

bot.onText(/\/start/, function (msg) {
  return bot.sendMessage(msg.chat.id, 'Hello, it me, El Señor Chefzimon.\n' +
    'First and foremost, if you have no idea what this is, please kindly leave. I dislike strangers.\n' +
    'If you are authorised by the authorities to communicate with me, kindly tell me your registered ' +
    'first name using /init <Your first name>. Note that the first name is case-sensitive.\n\n' +
    'If you require assistance, type /help and I will silently ignore your request but print a standardised message.');
});

bot.onText(/\/help/, function (msg) {
  return bot.sendMessage(msg.chat.id, 'My name is El Señor Chefzimon.\n' +
    'I can (but would prefer not to) do these amazing things:\n' +
    '/init <first name> - Registers your account with me\n' +
    '/postler - Asks me for the current Postler\n' +
    '/accept - Accepts your post offer and increments your counter\n' +
    '/next - Refuses the post offer, choosing somebody else using my entirely fair algorithm\n\n' +
    'If you encounter any issues, feel free to open an issue on GitHub: https://github.com/realzimon/backzimon-node');
});

bot.onText(/\/init (.+)/, function (msg, match) {
  ZiviService.findOneByName(match[1], function (zivi) {
    if (!zivi) {
      return bot.sendMessage(msg.chat.id, 'Sorry, El Señor Chefzimon is not aware of anyone with this name. Note that ' +
        'the name is case-sensitive. Do not hack El Señor Chefzimon because he possesses great power beyond human imagination.');
    }
    zivi.chat = msg.chat.id;
    ZiviService.saveZivi(zivi, function (err) {
      if (err) {
        return bot.sendMessage(msg.chat.id, 'El Señor Chefzimon is not sorry, but an error occurred either way.');
      }
      bot.sendMessage(msg.chat.id, 'You have connected your Telegram account to El Señor Chefzimon. He will now read ' +
        'all the messages you send to him. Do not send nudes.');
    });
  });
});

bot.onText(/\/postler/, function (msg) {

  checkAccountInitialisedOrFail(msg, function () {
    PostService.findCurrentState(function (post) {
      if (post.state === STATES.IDLE || !post.zivi) {
        return bot.sendMessage(msg.chat.id, 'Nobody has been selected yet. Stay alert.');
      }
      return bot.sendMessage(msg.chat.id, post.zivi.name + ' will carry out the Honourable Task.');
    });
  });

});

bot.onText(/\/accept/, function (msg) {
  checkAccountInitialisedOrFail(msg, function () {
    findPostAndCheckPreconditions(msg, function (err) {
      if (err) {
        return bot.sendMessage(msg.chat.id, err);
      } else {
        PostService.acceptPost(function () {
          bot.sendMessage(msg.chat.id, 'You have agreed to carry out the Honourable Task. Please note that this is ' +
            'a legally binding agreement. Should you not carry out the Honourable Task, your second-born child belongs ' +
            'to El Señor Chefzimon. Take care.');
          PostService.pushPostState();
        });
      }
    });
  });
});

bot.onText(/\/next/, function (msg) {
  checkAccountInitialisedOrFail(msg, function () {
    findPostAndCheckPreconditions(msg, function (err) {
      if (err) {
        return bot.sendMessage(msg.chat.id, err);
      } else {
        PostService.nextZivi(function (err, post) {
          bot.sendMessage(msg.chat.id, post.zivi.name + ' will carry out the Honourable Task.');
          PostService.pushPostState();
          TelegramService.sendPostlerPromptTo(post.zivi);
        });
      }
    });
  });
});

bot.onText(/\/cancel/, function (msg) {
  checkAccountInitialisedOrFail(msg, function () {
    findPostAndCheckPreconditions(msg, function (err, post) {
      if (err) {
        return bot.sendMessage(msg.chat.id, err);
      } else {
        PostService.justSetState(STATES.IDLE, function (err) {
          if (err) {
            console.error(' ## error cancelling Telegram post', err);
            bot.sendMessage(msg.chat.id, 'Error cancelling the Honourable Task. Try again later.')
          } else {
            bot.sendMessage(msg.chat.id, 'You have declined the Honourable Task and therefore ruined the fun for everyone. ' +
              'EL Señor Chefzimon is not amused. He will strike upon thee with great vengeance next time.');
          }
        });
      }
    });
  });
});

bot.onText(/\/dismiss/, function (msg) {
  checkAccountInitialisedOrFail(msg, function () {
    PostService.findCurrentState(function(post){
      if(post.state !== STATES.REMINDER){
        return bot.sendMessage(msg.chat.id, 'It\'s not time yet. Have a little patience.');
      }
      if(post.zivi.chat !== msg.chat.id){
        return bot.sendMessage(msg.chat.id, 'El Señor Chefzimon has *not* asked you to return the yellow card. Please do not annoy him again.');
      }
      PostService.dismissReminder(function(){
        return bot.sendMessage(msg.chat.id, 'El Señor Chefzimon is not convinced yet. He is watching you.');
      });
    });
  });
});

bot.onText(/\/volunteer/, function (msg) {
  checkAccountInitialisedOrFail(msg, function (senderZivi) {
    PostService.findCurrentState(function (post) {
      if (post.state === STATES.ACTION) {
        return bot.sendMessage(msg.chat.id, 'Somebody else is currently doing the post, so idk what you\'re doing');
      }
      if (post.zivi.chat === msg.chat.id) {
        return bot.sendMessage(msg.chat.id, 'You are already the assigned Postler. El Señor will not repeat himself again.');
      }
      PostService.forcePostler(senderZivi, function () {
        bot.sendMessage(msg.chat.id, 'This is your life now');
        TelegramService.sendPostlerPromptTo(post.zivi);
      });
    });
  });
});

TelegramService.sendZiviUpdateToUser = function (zivi, message) {
  if (!zivi.chat || zivi.chat === -1) {
    return console.log(' ## No Telegram chat for', zivi.name);
  }
  bot.sendMessage(zivi.chat, message);
};

TelegramService.sendPostlerPromptTo = function (zivi) {
  if (!zivi.chat || zivi.chat === -1) {
    return console.log(' ## No Telegram chat for', zivi.name);
  }
  bot.sendMessage(zivi.chat, 'Congratulations, you have been selected for the Honourable Task!\n' +
    'You may */accept* the offer later, when you\'re leaving,\n' +
    'request the */next* Zivi now if you absolutely cannot do it,\n' +
    'or */cancel* if there is no need.', {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: [
        ['/accept'],
        ['/next', '/cancel']
      ]
    }
  });
};

TelegramService.sendYellowCardReminder = function(zivi){
  if (!zivi.chat || zivi.chat === -1) {
    return console.log(' ## No Telegram chat for', zivi.name);
  }
  bot.sendMessage(zivi.chat, 'El Señor Chefzimon assumes that you have already returned ' +
    'the yellow card like a responsible adult. Type /dismiss to swear to ' +
    'the sacred GNU General Public License.', {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: [
        ['/dismiss']
      ]
    }
  });
};

function checkAccountInitialisedOrFail(msg, callback) {
  var chatId = msg.chat.id;
  ZiviService.findAll(function (zivis) {
    var senderZivi = false;
    zivis.forEach(function (zivi) {
      if (zivi.chat === chatId) {
        senderZivi = zivi;
      }
    });
    if (senderZivi) {
      callback(senderZivi);
    } else {
      return bot.sendMessage(msg.chat.id, 'You have not yet registered with the El Señor Chefzimon Telegram Integration. ' +
        'Type /help for more information.');
    }
  });
}

function findPostAndCheckPreconditions(msg, callback) {
  PostService.findCurrentState(function (post) {
    if (post.state !== STATES.PREPARATION) {
      return callback('It\'s not time yet. Have a little patience.');
    } else if (!post.zivi || post.zivi.chat !== msg.chat.id) {
      return callback('I\'m sorry, Dave, I cannot do this. You have not been selected for the Honourable Task.');
    }
    callback(null, post);
  });
}

module.exports = TelegramService;
