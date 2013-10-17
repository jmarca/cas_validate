/**
 * get_attributes
 *
 * get the user attributes parsed by xml parser and stored in the
 * session. Also, get the username too while we're at it.
 *
 * You can also directly access them at req.session.attributes, but
 * just in case that changes you can always rely on this to do the
 * right thing
 *
 * will invoke the callback with (error,attributes) attributes will
 * include username as well.  see the documentation above for
 * get_username
 *
 * if there are not attributes, will return only the username object
 *
 * If the attributes are empty and there is no username (perhaps there
 * is not a CAS session for this user), will invoke callback with
 * (error,{}) (an empty object)
 *
 * @param {Object} req the http.IncomingMessage (from express or connect)
 * @param {Function} next the callback to invoke with the attributes
 * @return {Object} returns whatever next invocation returns
 * @api public
 *
 */

var get_username = require('./getUsername');
var _ = require('underscore');

module.exports = function(req,next){
  return get_username(req,function(err,obj){
    if(req.session !== undefined && req.session.attributes !== undefined){
      return next(null,_.extend(obj,req.session.attributes))
    }else{
      return next(null,obj)
    }
  })
}
