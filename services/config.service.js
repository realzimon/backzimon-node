var fs = require('fs');
const CONFIG_DIRECTORY = './config/';
const LOCAL_CONFIG_PATH = CONFIG_DIRECTORY + 'local-config.json';
const EXAMPLE_CONFIG_PATH = CONFIG_DIRECTORY + 'example-config.json';

if(!fs.existsSync(EXAMPLE_CONFIG_PATH)) {
  console.error('Example config does not exist. Please restore it from git.');
  process.exit(1);
}

var configPath;
if(process.env.zimonTest) {
  configPath = EXAMPLE_CONFIG_PATH;
} else {
  if(!fs.existsSync(LOCAL_CONFIG_PATH)) {
    console.error('Local config file does not exist!');
    console.error('Please copy ',EXAMPLE_CONFIG_PATH, 'to', LOCAL_CONFIG_PATH, 'and configure the application!');
    process.exit(1);
  }
  configPath = LOCAL_CONFIG_PATH;
}
var localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

var ConfigService = {};

ConfigService.getUnchecked = function (propertyName) {
  if(localConfig.hasOwnProperty(propertyName)) {
    return localConfig[propertyName];
  } else {
    return undefined;
  }
};

ConfigService.getOrDefault = function (propertyName, def) {
  var value = ConfigService.getUnchecked(propertyName);
  if(value === undefined) {
    return def;
  } else {
    return value;
  }
};

ConfigService.getMongoUrl = function () {
  return ConfigService.getOrDefault('mongo-url', 'mongodb://127.0.0.1/zimon');
};

ConfigService.getTelegramApiKey = function () {
  return ConfigService.getUnchecked('telegram-api-key');
};

ConfigService.getSocketPort = function () {
  return ConfigService.getOrDefault('socket-port', 4001);
};

module.exports = ConfigService;
