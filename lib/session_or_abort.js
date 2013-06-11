var logger = require('./logger')('cas_validate::session_or_abort')

/**
 * session_or_abort
 *
 * if there is a session ticket from CAS in teh session, stored at
 * session.st, then stay on this route.  If not, then abort and go to
 * the next route, but calling next('route')
 *
 * This will only really work with express, as connect no longer has routing
 *
 */
function session_or_abort(){
    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){
            logger.debug('have session.  steady as she goes');
            // okay, pass control
            return next();
        }else{
            logger.debug('no session, switch to next route');
            return next('route');
        }
    }
}

module.exports=session_or_abort
