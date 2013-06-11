var redis = require("redis")
var redclient = redis.createClient();
var logger = require('./logger')('cas_validate::sax_parser')
redclient.on("error", function (err) {
    logger.error("Redis Client Error: " + err);
});
/**
* One day in seconds.
*/
var oneDay = 86400;

var _ttl = process.env.CAS_SESSION_TTL // in seconds


/**
 * set_session
 *
 * store the session id, and the CAS session ticket in Redis, for
 * single sign off.
 *
 * uses the 'req' object to pull out the st and sessionid, and also to
 * determine the maxage set for the session
 */
function set_session(req,cb){

    // ttl stuff borrowed & modified from  visionmedia / connect-redis.js  source code
    // Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>  MIT Licensed

    try {
        var maxAge = req.session.cookie.maxAge
        var ttl = _ttl || ('number' == typeof maxAge
                          ? maxAge / 1000 | 0
                          : oneDay)
        redclient.setex(req.session.st, ttl, req.sessionID, function(err){
            if(!err){
                 logger.debug('SETEX session ticket');
            }
            cb && cb(err)
        })
    } catch (err) {
        logger.error('saving session ticket to Redis threw an error')
        //throw new Error(err)
        cb && cb(err);
    }
}

/**
 * clear_session(st,request, callback)
 *
 * parameters:
 *
 * st: the session ticket, parsed from the CAS POST message
 *
 * request: the request object, which is needed for its link to the
 *          general session store for the web server
 *
 * callback: a function to call, will be passed any errors
 *
 * look in the redis db for the session associated with the given
 * session ticket (the st), and then remove the session from the
 * session store
 *
 */

function clear_st(st,req,callback){
    redclient.get(st
                 ,function(err,sid){
                      if(!err){
                          redclient.del(st);
                          clear_session(sid,req,callback)
                      }else{
                          callback && callback(err)
                      }
                      return null
                  })
    return null
}

function clear_session(sessionID,req,callback){
    req.sessionStore.destroy(sessionID,function(err){
        if(err){
            logger.error(err);
        }
        callback && callback(err)
        return null
    })
    return null
}
exports.set_session=set_session
exports.clear_st=clear_st
exports.clear_session=clear_session
