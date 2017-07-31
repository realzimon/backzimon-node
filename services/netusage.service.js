var ConfigService = require('./config.service');
var ZiviService = require('../services/zivi.service');
var http = require('http');
var socket = require('./socket.service');

const NetUsageService = {};
NetUsageService.PUSH_INTERVAL_SECONDS = 15;

var prevUsages = {};
var errCounter = 0;
var macToZiviCache = {};

NetUsageService.loadAndPushNetUsage = function () {
  retrieveUsageHTML(function (content) {
    var totalUsages = NetUsageService.extractTotalUsagesFromHTML(content);
    var uniqueUsages = sumDuplicateUsages(totalUsages);
    pushUsageDiffSinceLastPush(uniqueUsages);
  });
};

function retrieveUsageHTML(cb) {
  if (process.env.zimonTest) {
    console.error(' ### cannot retrieve net usage from remote from unit tests');
    return;
  }
  http.get({
    host: ConfigService.getNetUsageHost(),
    path: ConfigService.getNetUsagePath()
  }, function (res) {
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
    res.on('end', function () {
      return cb && cb(content);
    });
    res.on('error', function (err) {
      errWithRateLimit('Failed to retrieve net usage...', err);
    })
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

NetUsageService.extractTotalUsagesFromHTML = function (htmlDoc) {
  var subArraysStr = NetUsageService.extractSubArraysStrFromHTML(htmlDoc);
  if (!subArraysStr) {
    console.error(' ### Unable to find top array for net usage');
    return [];
  }
  return NetUsageService.extractTotalUsagesFromSubArrays(subArraysStr);
};

// we're matching one of two script tags that contains the network
// usage data for all devices as an array of arrays,
// first obtaining the top array - first group is list of sub arrays

const TOP_ARRAY_RE = /<script type="text\/javascript">\s+var values = new Array\(([^;]+)\);/;
NetUsageService.extractSubArraysStrFromHTML = function (htmlDoc) {
  var match = htmlDoc.match(TOP_ARRAY_RE);
  return match ? match[1] : false;
};

// matches list of sub arrays in this format:
//     new Array("DESKTOP-ANQ67MT","2c:41:38:9a:2f:3e","192.168.1.235",
//     77967001.000000,1565928,79532929,"04-03-2017_10:31:11","05-03-2017_00:14:57"),
// which are, in order, display name, MAC, Local IP,
// total download (b), total upload (b), total down+up (b), first seen time, last seen time
// match groups: display name, MAC, download (bits, trimmed to int)

const SUB_ARRAY_RE = /new Array\("(.+?)","(.+?)",".+",\s+?(\d+).+\)/g;
NetUsageService.extractTotalUsagesFromSubArrays = function (subArraysStr) {
  var totalUsages = [];
  var match;
  while ((match = SUB_ARRAY_RE.exec(subArraysStr)) !== null) {
    totalUsages.push({
      hostname: match[1],
      mac: match[2],
      totalDownload: parseInt(match[3], 10)
    });
  }
  return totalUsages;
};

function sumDuplicateUsages(totalUsages) {
  var uniqueUsages = [];
  var macToFirstUsage = {};
  for(var i = 0; i < totalUsages.length; i++) {
    var usage = totalUsages[i];
    if(!usage || !usage.mac) {
      continue;
    }
    var existingUsage = macToFirstUsage[usage.mac];
    if(existingUsage) {
      existingUsage.totalDownload += usage.totalDownload;
    } else {
      macToFirstUsage[usage.mac] = usage;
      uniqueUsages.push(usage);
    }
  }
  return uniqueUsages;
}

function pushUsageDiffSinceLastPush(totalUsages) {
  NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
  storeAsPrevUsages(totalUsages);
  var cleanUsages = NetUsageService.sortDescAndSanitise(totalUsages);
  findMacsToZivis(function (err, macsToZivis) {
    if(err) {
      return console.error('Error finding macs to zivis', err);
    }
    populateUsagesWithZivisByMac(cleanUsages, macsToZivis);
    socket.writeToSocket('netusage', {
      usage: cleanUsages
    });
  });
}

function findMacsToZivis(callback) {
  ZiviService.findAll(function (err, zivis) {
    if(err) {
      return callback && callback(err);
    }
    var macsToZivis = {};
    zivis.forEach(function (zivi) {
      if (zivi && zivi.addresses) {
        zivi.addresses.forEach(function (address) {
          macsToZivis[address] = zivi;
        })
      }
    });
    callback(null, macsToZivis);
  });
}

function populateUsagesWithZivisByMac(totalUsages, macsToZivis) {
  totalUsages.forEach(function (usage) {
    usage.zivi = macsToZivis[usage.mac];
  });
}

NetUsageService.addUsageDiffComparedToInto = function (prevUsagesObj, totalUsages) {
  for (var i = 0; i < totalUsages.length; i++) {
    var currentUsage = totalUsages[i];
    if (!currentUsage || !currentUsage.mac) {
      continue;
    }
    var prevUsage = prevUsagesObj[currentUsage.mac];
    if (prevUsage && currentUsage.totalDownload && prevUsage <= currentUsage.totalDownload) {
      currentUsage.recentDownload = currentUsage.totalDownload - prevUsage;
    } else {
      currentUsage.recentDownload = 0;
    }
    currentUsage.recentDownloadRate = currentUsage.recentDownload / NetUsageService.PUSH_INTERVAL_SECONDS;
  }
};

function storeAsPrevUsages(totalUsages) {
  prevUsages = {};
  for (var i = 0; i < totalUsages.length; i++) {
    var currentUsage = totalUsages[i];
    if (currentUsage && currentUsage.mac && currentUsage.totalDownload) {
      prevUsages[currentUsage.mac] = currentUsage.totalDownload;
    }
  }
}

NetUsageService.sortDescAndSanitise = function (totalUsages) {
  var cleanUsages = totalUsages.filter(function (usage) {
    return usage && usage.recentDownload && usage.mac;
  });
  cleanUsages.sort(function (u1, u2) {
    return u2.recentDownload - u1.recentDownload;
  });
  return cleanUsages;
};

module.exports = NetUsageService;
