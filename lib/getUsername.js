/**
 * get_username
 *
 * get the user name provided by the CAS server, stored in the current session
 *
 * You can also directly access them at req.session.name, but
 * just in case that changes you can always rely on this to do the
 * right thing
 *
 * will invoke the callback with (error,{'username':username})
 *
 * If there is no username (perhaps you do not have a CAS session),
 * then it will invoke callback with (error,{}) (an empty object)
 *
 * @param {Object} req the http.IncomingMessage (from express or connect)
 * @param {Function} next the callback to invoke with the username object
 * @return {Object} returns whatever next invocation returns
 * @api public
 *
 */
module.exports = function(req,next) {
  if(req.session !== undefined && req.session.name !== undefined){
    return next(null,{'user_name':req.session.name})
  }else{
    return next(null,{})
  }
}
