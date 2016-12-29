var express = require('express');
var router = express.Router();
var shuffle = require('shuffle-array');

const STATES = require('../../config/states');
var models = require('../../models/index');

router.get('/', function (req, res) {
  models.Post.findOne({}).then(function (response) {
    return res.json(response);
  });
});

/**
 * Changes the state on the server, the valid options are:
 * next: the chosen one, does not accept the offer, or is not available today, so the next
 * person will be chosen (randomly)
 * cancel: there is no post for today
 * accepted: zimon made an offer that cant be refused and the zivi has accepted it
 */
router.put('/', function (req, res) {
  var action = req.body.action;
  if (!action) {
    return res.status(400).json({
      err: 'No action given'
    });
  }

  console.log(action);

  switch (action) {
    case 'next':
      models.Post.findOne({}).then(function (post) {
        if (post.state !== STATES.PREPERATION) {
          return res.status(400).json({
            err: 'Zivi cant be changed as the state is not PREPARING'
          });
        }
        models.Zivi.find({
          name: {
            $ne: post.zivi ? post.zivi.name : ''
          }
        }).then(function(zivis){
          shuffle(zivis);
          post.zivi = zivis[0];
          post.save(function (err) {
            if (err) {
              return res.status(500).json({
                err: 'Something went wrong on changing the zivi'
              })
            }
            return res.json();
          })
        });
      });
      break;
    case 'accepted':
      models.Post.findOne({}).then(function (post) {
        if (post.state !== STATES.PREPERATION) {
          return res.status(400).json({
            err: 'Zivi cant accept as the state is not PREPARING'
          });
        }
        post.state = STATES.ACTION;
        post.save(function (err) {
          if (err) {
            return res.status(500).json({
              err: 'Something went wrong on changing the zivi'
            })
          }
          models.Zivi.findOne({name: post.zivi.name}).then(function (zivi) {
            zivi.post_count += zivi.post_count + 1;
            zivi.save(function (err) {
              if (err) {
                return res.status(500).json({
                  err: 'Something went wrong on updating the user post'
                });
              }
              return res.json();
            });
          })

        })
      });
      break;
    //TODO: Implement cancel
    case 'cancel':
      break;
    case 'dismiss-reminder':
      models.Post.findOne({}).then(function (post) {
        if (post.state !== STATES.REMINDER) {
          return res.status(400).json({
            err: 'Cannot dismiss reminder when not in reminder state (is: ' + post.state + ')'
          });
        } else {
          post.state = STATES.IDLE;
          post.timestamp = new Date();
          post.save(function (err) {
            if (err) {
              return res.status(500).json({
                err: 'database error while attempting to save state'
              });
            } else {
              return res.json();
            }
          });
        }
      });
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
