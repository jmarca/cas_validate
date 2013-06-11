var logger = require('./logger')('invalidate')
var libxmljs = require("libxmljs")
var clear_st = require('./ticket_store').clear_st

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
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end();
            })
            return null;
        }
    }
    // I used to call next(new Error('Unauthorized'))
    // leave that to the calling route to do.
    // closes issue #6
    return next()
    return null;
};
module.exports=invalidate
