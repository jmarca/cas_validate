var libxmljs = require("libxmljs")
var parseUrl = require('url').parse
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

function make_sax_parser(req,res,next){
    var saxparser = new libxmljs.SaxParser()
    var errors
    //clear req.session.name to prevent duplicates on the string append in usercharhandler
    delete req.session.name
    var usercharhandler=function(chars){
    if(req.session.name){
                req.session.name += chars
            }else{
                req.session.name = chars
            }
            return null
        }
        req.session.attributes={}
        var attrcharhandler=function(attrname){
            return function(chars){
                req.session.attributes[attrname]=chars
            }
        }
        var attrhandler=function(e,a,p,u,n){
            saxparser.once('characters',attrcharhandler(e))
        }

        function startHandler(elem, attrs, prefix, uri, namespaces) {
            if(elem === 'authenticationSuccess'){
                logger.debug('auth passed ');
                req.session.st = req.session.ticket;
                // stuff into a redis session for single sign off
                // set_session(req.session.st,req.sessionID);
                set_session(req,function(err){
                    if(err){
                        errors = err
                        return next(err)
                    }
                    return null
                })
            }
            if(elem==='authenticationFailure'){
                var attr = attrs[0]
                if(attr[0]==='code' && attr[3]==='INVALID_TICKET'){
                    logger.debug('auth failed') ;
                    delete req.session.st
                }
            }
            if(elem==='user'){
                // valid user
                saxparser.on('characters',usercharhandler)
            }
            if(elem==='attributes'){
                // valid user
                saxparser.on('startElementNS',attrhandler)
            }
            return null
        }
        saxparser.on('startElementNS',startHandler)

        function endHandler(elem, attrs, prefix, uri, namespaces) {

            // could also use once above, but this is safer
            if(elem==='user'){
                // turn off user chars handler
                saxparser.removeListener('characters',usercharhandler)
            }
            if(elem==='attributes'){
                // valid attributes, done
                saxparser.removeListener('startElementNS',attrhandler)
            }
        }
        saxparser.on('endElementNS',endHandler)
        saxparser.on('endDocument',function(){
            // strip the ticket and redirect back
            // // this doesn't work properly
            // if(url.query.ticket){
            //     delete url.query.ticket
            //     delete url.search
            // }
            //
            // the above is okay, but fails because it does nothing.
            // redirecting works, but kills the session, so you end up
            // in a redirect loop.
            //
            // no matter what I try, redirect will kill the session.
            // so just live with the ticket for now until I figure this out
            if(req.session.st){
                logger.debug('parsed xml doc, got:  user name = '+req.session.name+', attributes are: ' +JSON.stringify(req.session.attributes))
                if(!errors){
                    next()
                }
            }else{
                // possibly a bad, stale ticket in request
                var url = parseUrl(req.url,true);
                var path = url.pathname
                res.writeHead(307, { 'location': path })
                res.end()
            }
            return null
        })
    return saxparser
}

module.exports=make_sax_parser
