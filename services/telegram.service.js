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

bot.onText(/\/start/, function (msg, match) {
  return bot.sendMessage(msg.chat.id, 'To initialise this bot with your profile, type: /init <Your first name> (Case sensitive)\n' +
    'For help, type: /help');
});

bot.onText(/\/help/, function (msg, match) {
  return bot.sendMessage(msg.chat.id, 'These commands are available:\n' +
    '/init <first name> - Initialises this bot to work with your account\n' +
    '/postler - Gets the currently selected Postler\n' +
    '/accept - Accepts your post offer and increments your counter\n' +
    '/next - Refuses the post offer and chooses somebody else (chosen randomly and fairly)\n');
});

bot.onText(/\/init (.+)/, function (msg, match) {
  ZiviService.findOneByName(match[1], function (zivi) {
    if (!zivi) {
      return bot.sendMessage(msg.chat.id, 'No Zivi found for this name (Case sensitive)');
    }
    zivi.chat = msg.chat.id;
    ZiviService.saveZivi(zivi, function (err) {
      if (err) {
        return bot.sendMessage(msg.chat.id, 'Something went wrong while saving :(');
      }
      bot.sendMessage(msg.chat.id, 'Updated your status, you will now receive post updates!');
    });
  });
});

bot.onText(/\/postler/, function (msg, match) {

  checkAccountInitialisedOrFail(msg, function (init) {
    PostService.findCurrentState(function (post) {
      if (post.state === STATES.IDLE || !post.zivi) {
        return bot.sendMessage(msg.chat.id, 'Nobody has been selected. Stay alert.');
      }
      return bot.sendMessage(msg.chat.id, post.zivi.name + ' is The Chosen One.');
    });
  });

});

bot.onText(/\/accept/, function (msg, match) {
  checkAccountInitialisedOrFail(msg, function (init) {
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

bot.onText(/\/next/, function (msg, match) {

  checkAccountInitialisedOrFail(msg, function (init) {
    PostService.findCurrentState(function (post) {
      if (post.state !== STATES.PREPARATION) {
        return bot.sendMessage(msg.chat.id, 'Post is not in preparing state');
      }
      if (!post.zivi || post.zivi.chat !== msg.chat.id) {
        return bot.sendMessage(msg.chat.id, 'You are not the selected postler');
      }
      PostService.nextZivi(function (err, zivi) {
        bot.sendMessage(msg.chat.id, 'Selected another zivi');
        PostService.pushPostState();
        TelegramService.sendZiviUpdateToUser(zivi, 'You are the selected postler');
      });
    });
  });
});

TelegramService.sendZiviUpdateToUser = function (zivi, message) {
  if (!zivi.chat || zivi.chat === -1) {
    return console.log('Zivi ' + zivi.name + ' does not have a valid chat id');
  }
  bot.sendMessage(zivi.chat, message);
};

TelegramService.sendPostlerPromptTo = function (zivi) {
  if (!zivi.chat || zivi.chat === -1) {
    return console.log(' ## No Telegram chat for', zivi.name);
  }
  bot.sendMessage(zivi.chat, 'Congratulations, you have been selected for Postler!\n' +
    'You may _accept_ the offer when you\'re leaving,\n' +
    'request the _next_ Postler now if you cannot complete the post,\n' +
    'or _decline_ if there is no need to do the post.', {
    parse_mode: 'Markdown',
    reply_markup: {
      one_time_keyboard: true,
      resize_keyboard: true,
      keyboard: [
        ['/accept'],
        ['/next', '/decline']
      ]
    }
  });
};

function checkAccountInitialisedOrFail(msg, callback) {
  var chatId = msg.chat.id;
  ZiviService.findAll(function (zivis) {
    var init = false;
    zivis.forEach(function (zivi) {
      if (zivi.chat === chatId) {
        init = true;
      }
    });
    if (init) {
      callback(init);
    } else {
      return bot.sendMessage(msg.chat.id, 'You have not yet registered with the bot. Type /help for more information.');
    }
  });
}

module.exports = TelegramService;
