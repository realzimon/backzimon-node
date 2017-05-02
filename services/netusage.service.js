var http = require('http');
var socket = require('./socket.service');

const NetUsageService = {};

var oldDate, oldValues = [];

var errCounter = 0;

NetUsageService.loadAndPushNetUsage = function(){

  loadWebsite(function(content){
    matchWebSite(content);
  });

};

function pushToClient(data){
  socket.writeToSocket('netusage', {
    netUsage: data
  });
}

function loadWebsite(cb){
  http.get({
    host: '192.168.1.1',
    path: '/usage/live.html'
  }, function(res){
    if (res.statusCode !== 200) {
      errWithRateLimit('Failed to retrieve net usage:', res);
      res.resume();
      return;
    }
    var content = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      content += chunk;
    });
    res.on('end', function(){
      return cb && cb(content);
    });
  }).on('error', function (err) {
    errWithRateLimit('Failed to retrieve net usage..', err);
  });
}

function errWithRateLimit(msg, err) {
  errCounter++;
  if (errCounter < 2) {
    console.error(msg, err);
  } else if (errCounter > 10) {
    errCounter = 0;
    console.error(msg, err, 'and 8 more...');
  }
}

function matchWebSite(content){
  var re = /(var values = new Array[^;]*;)/, match = content.match(re);
  if (!match) {
    console.log('err');
  } else {
    // evaluate values
    eval(match[1]);
    //noinspection JSUnresolvedVariable
    var v = values;
    if (v) {
      pushToClient(handleValues(v));
      oldValues = v;
      // set old date
      oldDate = new Date();
    }
  }
}

function getSize(size) {
  var prefix = [' ', 'k', 'M', 'G', 'T', 'P', 'E', 'Z'];
  var precision, base = 1000, pos = 0;
  while (size > base) {
    size /= base;
    pos++;
  }
  if (pos > 2) precision = 1000; else precision = 1;
  return (Math.round(size * precision) / precision) + ' ' + prefix[pos] + 'B';
}
function dateToString(date) {
  return date.toString().substring(0, 24);
}
function getDateString(value) {
  var tmp = value.split('_'),
    str = tmp[0].split('-').reverse().join('-') + 'T' + tmp[1];
  return dateToString(new Date(str));
}
function isArray(obj) {
  return obj instanceof Array;
}

function handleValues(values) {
  if (!isArray(values)) return '';
  // find data
  var data = [], totals = [0, 0, 0, 0, 0];
  for (var i = 0; i < values.length; i++) {
    var d = handleRow(values[i]);
    if (d[1]) {
      data.push(d);
      // get totals
      for (var j = 0; j < totals.length; j++) {
        totals[j] += d[1][3 + j];
      }
    }
  }
  // sort data
  data.sort(function (x, y) {
    var a = x[1], b = y[1];
    for (var i = 3; i <= 7; i++) {
      if (a[i] < b[i]) return 1;
      if (a[i] > b[i]) return -1;
    }
    return 0;
  });
  var resultsToPush = [];
  for (var k = 0; k < data.length; k++) {
    if(k > 5){
      break;
    }
    resultsToPush.push({
      hostname: data[k][1][0],
      download: data[k][1][3],
      upload: data[k][1][4],
      mac: data[k][1][1]
    })
  }

  return resultsToPush;
}

function handleRow(data) {
  // check if data is array
  if (!isArray(data)) return [''];
  // find old data
  var oldData;
  for (var i = 0; i < oldValues.length; i++) {
    var cur = oldValues[i];
    // compare mac addresses
    if (oldValues[i][1] === data[1]) {
      oldData = cur;
      break;
    }
  }
  // find download and upload speeds
  var dlSpeed = 0, upSpeed = 0;
  if (oldData) {
    var now = new Date(),
      seconds = (now - oldDate) / 1000;
    dlSpeed = (data[3] - oldData[3]) / seconds;
    upSpeed = (data[4] - oldData[4]) / seconds;
  }
  // create rowData
  var rowData = [];
  for (var j = 0; j < data.length; j++) {
    rowData.push(data[j]);
    if (j === 2) {
      rowData.push(dlSpeed, upSpeed);
    }
  }
  return [null, rowData];
}

module.exports = NetUsageService;
