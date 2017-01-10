/**
 * No-op dummy implementation of the Telegram service, so that it can still be called even if
 * there is no API key. Do not require this directly.
 */
var TelegramService = {};

TelegramService.sendZiviUpdateToUser = function (zivi, message) {

};

TelegramService.sendPostlerPromptTo = function (zivi) {

};

TelegramService.sendYellowCardReminder = function (zivi) {

};

module.exports = TelegramService;
