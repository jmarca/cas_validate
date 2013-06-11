/*global require process console JSON __dirname */
var parseUrl = require('url').parse
var formatUrl = require('url').format
var http = require('http')
var request = require('request')
var querystring = require('querystring')
var redis = require("redis")
var _ = require('underscore')

var force_protocol=require('./force_protocol')

/**
 * CAS validate:  validate requests via CAS service tickets
 *
 * Options:
 *
 *   - `serivce`  the service url we are checking.  probably best to leave it blank
 *   - `cas_host` the CAS host.  will fallback to environment variable CAS_HOST
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */


var logger = require('./logger')('cas_validate')

var redclient = redis.createClient();

redclient.on("error", function (err) {
    logger.error("Redis Client Error: " + err);
});

function username(req,res,next){
    res.setHeader('Content-Type','application/json');
    if(req.session !== undefined && req.session.name !== undefined){
        return res.end(JSON.stringify({'user':req.session.name}));
    }else{
        return res.end(JSON.stringify({'user':null}));
    }
}

// these should be settable options
var validation_service = '/cas/serviceValidate';
var login_service = '/cas/login';



function session_or_abort(){
    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){
            logger.debug('have session.  steady as she goes');
            // okay, pass control
            return next();
        }else{
            logger.debug('no session, switch to next route');
            return next('route');//new Error('unauthorized'));
        }
    }
}


function check_no_redirect(options){
    _.extend(options, {'gateway':true});
    return redirect(options);
}

function redirect(options){
    // if no session, and no ticket in request, then redirect;
    // service param is optional, will default to whatever URL is used in the request

    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('no CAS host specified');

    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(opt_service === undefined){
        throw new Error('API change. The service parameter is now required in the options object because guessing the service from the request header is a security bug')
    }
    var gateway = options.gateway; // default to false
    return function(req,res,next){
        //  redirect to CAS server
        var queryopts = {'service':opt_service};
        if(gateway){
            // prevent an infinite loop
            if(req.session.gateway !== undefined){
                logger.debug('gateway already checked')
                return next()
            }
            logger.debug('gateway check to be done')
            req.session.gateway = true
            queryopts.gateway = gateway;
        }else{
            //
            // May 2013 bug fix
            // prevent failing to notice login if
            // gateway, then
            // login, then
            // gateway.
            //
            logger.debug('clear gateway')
            delete req.session.gateway

        }
        // previous version had an if here, with a 403 if request was
        // a json, but that never worked anyway
        res.writeHead(307, { 'location': cas_host+login_service
                              +'?'
                              +querystring.stringify(queryopts)
                           });
        return res.end();
    }
}



function logout(options){
    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('no CAS host specified');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    return function(req,res,next){
        // for logging out directly
        // I'd use async.parallel here, but no real need
        var logouturl = cas_host + '/cas/logout';
        if(opt_service){
            logouturl+='?'+querystring.stringify({'service':opt_service})
        }
        req.session.destroy(function(err){
            if(err){
                logger.error(err)
            }
        });
        res.writeHead(307, { 'location': logouturl });
        res.end()
    }
}


function invalidate(req,res,next){
    // handling a post here

    // parse out the ticket number from the body, then get the
    // sessionid associated with that ticket, and destroy it.
    logger.debug('handling ssoff')
    for( var param in req.body){
        if(/<samlp:SessionIndex>(.*)<\/samlp:SessionIndex>/.exec(req.body[param])){
            var st = RegExp.$1;
            logger.debug("RECEIVED POST SSOFF REQUEST...INVALIDATING SERVICE TICKET "+st);
            redclient.get(st,function(err,sid){
                if(!err){
                    req.sessionStore.destroy(sid,function(err){
                        if(err){
                            logger.error(err);
                        }
                    });
                    redclient.del(st);
                }
            });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end();
            return null;
        }
    }
    // I used to call next(new Error('Unauthorized'))
    // leave that to the calling route to do.
    // closes issue #6
    return next()
    return null;
};


function ssoff(){
    return function(req,res,next){
        logger.debug('in ssoff')
        var method = req.method.toLowerCase();
        if (method == 'post'){
            return invalidate(req,res,next);
        }else{
            logger.debug('not a post')
            next();
        }
        return null;
    }
}






exports.redirect = redirect;
exports.check_or_redirect = require('./check_or_redirect')
exports.check_and_return = check_no_redirect;
exports.ticket = require('./ticket')
exports.ssoff = ssoff;
exports.logout = logout;
exports.username = username;
exports.session_or_abort = session_or_abort;
