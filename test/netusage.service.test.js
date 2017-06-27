var TestUtils = require('./test.utils.js');
var assert = require('assert');
var sinon = require('sinon');
var fs = require('fs');
var NetUsageService = require('../services/netusage.service');
var mocha = require("mocha");
var describe = mocha.describe;
var it = mocha.it;

var sandbox;
mocha.beforeEach(function () {
  sandbox = sinon.sandbox.create();
});
mocha.afterEach(function () {
  sandbox.restore();
});

var exampleUsageHTML = fs.readFileSync(__dirname + '/example-usage.html', 'utf8');
var exampleSubArrays = fs.readFileSync(__dirname + '/example-subarrays.txt', 'utf8');

describe('NetUsageService', function () {
  describe('extractSubArraysStrFromHTML', function () {
    it('should return false for an arbitrary string', function () {
      assert.equal(NetUsageService.extractSubArraysStrFromHTML('<!doctype html>'), false);
    });
    it('should return the example sub arrays from the example HTML', function () {
      assert.equal(NetUsageService.extractSubArraysStrFromHTML(exampleUsageHTML) + '\n', exampleSubArrays);
    })
  });

  describe('extractTotalUsagesFromSubArrays', function () {
    it('should return an array with n elements for the example sub arrays', function () {
      var totalUsages = NetUsageService.extractTotalUsagesFromSubArrays(exampleSubArrays);
      assert.equal(totalUsages.length, 35);
      // check some of the data, checking all would be overkill
      assert.deepEqual(
        totalUsages[0],
        {hostname: 'DESKTOP-ANQ67MT', mac: '2b:41:38:9a:2f:3e', totalDownload: 208581997793},
        'first sub array'
      );
      assert.deepEqual(
        totalUsages[2],
        {hostname: 'ab:bc:32:8d:22:95', mac: 'ab:bc:32:8d:22:95', totalDownload: 110411647110},
        'third sub array where mac = name'
      );
      assert.deepEqual(
        totalUsages[34],
        {hostname: '00:0c:89:40:3e:d4', mac: '00:0c:89:40:3e:d4', totalDownload: 0},
        'last sub array where mac = name and no download'
      );
    });
  });

  describe('extractTotalUsagesFromHTML', function () {
    it('should return empty array if there is no usage in the HTML', function () {
      var res = NetUsageService.extractTotalUsagesFromHTML('<!doctype html><body><script type="text/javascript">alert("PWNED!");</script>lol</body>');
      assert.deepEqual(res, [], 'is empty array');
    });
    it('should return an array with more than zero elements from the example HTML', function () {
      var res = NetUsageService.extractTotalUsagesFromHTML(exampleUsageHTML);
      assert.ok(res.length > 0, 'result has no elements');
    });
  });

  describe('addUsageDiffComparedToInto', function () {
    it('should not fail if both parameters are empty', function () {
      NetUsageService.addUsageDiffComparedToInto({}, []);
    });
    it('should assume zero recent usage if there are no previous usages', function () {
      var prevUsages = {};
      var totalUsages = [
        {hostname: 'DESKTOP-ANQ67MT', mac: '2b:41:38:9a:2f:3e', totalDownload: 208581997793}
      ];
      NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
      assert.equal(totalUsages[0].recentDownload, 0);
    });
    it('should correctly compute recent usage', function () {
      var prevUsages = {'2b:41:38:9a:2f:3e': 500};
      var totalUsages = [
        {hostname: 'DESKTOP-ANQ67MT', mac: '2b:41:38:9a:2f:3e', totalDownload: 600}
      ];
      NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
      assert.equal(totalUsages[0].recentDownload, 100);
    });
    it('should correctly compute recent usage with multiple clients', function () {
      var prevUsages = {'2b:41:38:9a:2f:3e': 500, '00:0c:89:40:3e:d4': 357};
      var totalUsages = [
        {hostname: 'DESKTOP-ANQ67MT', mac: '2b:41:38:9a:2f:3e', totalDownload: 600},
        {hostname: '00:0c:89:40:3e:d4', mac: '00:0c:89:40:3e:d4', totalDownload: 557}
      ];
      NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
      assert.equal(totalUsages[0].recentDownload, 100);
      assert.equal(totalUsages[1].recentDownload, 200);
    });
    it('should correctly compute recent usage for clients with no download', function () {
      var prevUsages = {'00:0c:89:40:3e:d4': 0};
      var totalUsages = [
        {hostname: '00:0c:89:40:3e:d4', mac: '00:0c:89:40:3e:d4', totalDownload: 0}
      ];
      NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
      assert.equal(totalUsages[0].recentDownload, 0);
    });
    it('should not return negative usages', function () {
      var prevUsages = {'00:0c:89:40:3e:d4': 678};
      var totalUsages = [
        {hostname: '00:0c:89:40:3e:d4', mac: '00:0c:89:40:3e:d4', totalDownload: 17}
      ];
      NetUsageService.addUsageDiffComparedToInto(prevUsages, totalUsages);
      assert.equal(totalUsages[0].recentDownload, 0);
    });
  });

  describe('sortDescAndSanitise', function () {
    it('should drop invalid objects', function () {
      var dirtyUsages = [
        null,
        undefined,
        0,
        500,
        {},
        {doesNotContainRecentDownload: true, mac: 'though'},
        {noMac: true, recentDownload: 15},
        {mac: true, recentDownload: 0}
      ];
      var cleanUsages = NetUsageService.sortDescAndSanitise(dirtyUsages);
      assert.deepEqual(cleanUsages, []);
    });
    it('should keep valid objects', function () {
      var dirtyUsages = [ //already sorted for deep-equal
        {hostname: '00:0c:89:40:3e:d4', mac: '00:0c:89:40:3e:d4', recentDownload: 600},
        {hostname: 'DESKTOP-ANQ67MT', mac: '2b:41:38:9a:2f:3e', recentDownload: 17}
      ];
      var cleanUsages = NetUsageService.sortDescAndSanitise(dirtyUsages);
      assert.deepEqual(cleanUsages, dirtyUsages);
    });
    it('should sort clients with more recent downloads first', function () {
      var dirtyUsages = [
        {mac: true, recentDownload: 1},
        {mac: true, recentDownload: 1337},
        {mac: true, recentDownload: 9001},
        {mac: true, recentDownload: 1}
      ];
      var cleanUsages = NetUsageService.sortDescAndSanitise(dirtyUsages);
      assert.deepEqual(cleanUsages[0], dirtyUsages[2], '9001 should be first');
      assert.deepEqual(cleanUsages[1], dirtyUsages[1], '1337 should be second');
      assert.deepEqual(cleanUsages[2], dirtyUsages[0], '1 should be next to last');
      assert.deepEqual(cleanUsages[3], dirtyUsages[3], '1 should be last');
    })
  });
});
