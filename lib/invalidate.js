var logger = require('./logger')('cas_validate::invalidate')
var libxmljs = require("libxmljs2")
var clear_st = require('./ticket_store').clear_st

/**
 * invalidate
 *
 * parameters
 *
 * req : the incoming request.  This is *from the CAS server* not the
 *       user of this service.
 *
 * res : the response object
 *
 * next : the callback to fire if we don't trigger res.end() here
 *
 * Invalidate parses the incoming request for the ssoff message.  If
 * it does not see it, then it will return a call to next().  If it
 * does see the ssoff message from the CAS server, then it will
 * attempt to invalidate the session that is associated with the
 * service ticket sent in the post message.
 *
 * Finally, at this time invalidate is expecting an XML post, as
 * described on this page:
 * https://wiki.jasig.org/display/CASUM/Single+Sign+Out
 *
 * I do not know how the JSON plug in works, but I suspect if the JSON
 * plug in sends the user credentials as JSON, it might also send the
 * sign-out post as JSON.  TBD
 *
 */
function invalidate(req,res,next){
    // handling a post here

    // parse out the ticket number from the body, then get the
    // sessionid associated with that ticket, and destroy it.

    logger.debug('handling ssoff')

    // var saxparser = new libxmljs.SaxParser()
    // console.log(req.body)
    // throw new Error('croak')
    for( var param in req.body){
        if(/<samlp:SessionIndex>(.*)<\/samlp:SessionIndex>/.exec(req.body[param])){
            var st = RegExp.$1;
            logger.debug("RECEIVED POST SSOFF REQUEST...INVALIDATING SERVICE TICKET "+st);
            clear_st(st,req,function(){
                logger.debug('finishing connection with CAS server')
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end();
            })
            return null;
        }
    }
    // if still here, did not trip the "return null" above, and so
    // that means that the post did not match anything I'm looking for
    //
    // I used to call next(new Error('Unauthorized'))
    // leave that to the calling route to do.
    // closes issue #6
    return next()
};
module.exports=invalidate
