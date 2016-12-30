var express = require('express');
var router = express.Router();

const STATES = require('../../config/states');
var PostService = require('../../services/post.service.js');

router.get('/', function (req, res) {
  PostService.findCurrentState(function (response) {
    return res.json(response);
  });
});

function orRespond(res, status, message) {
  return function (err) {
    if (err) {
      return res.status(status).json({
        err: message ? message : err
      });
    } else {
      return res.json();
    }
  };
}

//noinspection JSUnresolvedFunction
/**
 * Changes the state on the server, the valid options are:
 * next: the chosen one, does not accept the offer, or is not available today, so the next
 * person will be chosen (randomly)
 * cancel: there is no post for today
 * accepted: Zimon made an offer that cant be refused and the zivi has accepted it
 */
router.put('/', function (req, res) {
  var action = req.body.action;
  if (!action) {
    return res.status(400).json({
      err: 'No action given'
    });
  }
  console.log(' -- post action: ' + action);
  switch (action) {
    case 'next':
      PostService.nextZivi(orRespond(res, 500));
      break;
    case 'accepted':
      PostService.acceptPost(orRespond(res, 500));
      break;
    case 'cancel':
      PostService.justSetState(STATES.IDLE, orRespond(res, 500));
      break;
    case 'dismiss-reminder':
      PostService.dismissReminder(orRespond(res, 500));
      break;
    default:
      return res.status(400).json({
        err: 'Illegal action'
      });
  }
});

router.post('/', function (req, res) {
  return res.json(null);
});

module.exports = router;
