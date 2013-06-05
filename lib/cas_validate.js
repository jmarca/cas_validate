/*global require process console JSON __dirname */
var parseUrl = require('url').parse
var formatUrl = require('url').format
var http = require('http')
var request = require('request')
var querystring = require('querystring')
var redis = require("redis")
var _ = require('underscore')
var winston = require("winston");

var env = process.env;
var chost = env.CAS_HOST;
chost = force_protocol(chost)

var libxmljs = require("libxmljs")

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


// set up logging per: https://gist.github.com/spmason/1670196
var logger = new winston.Logger()
var production = (env.NODE_ENV || '').toLowerCase() === 'production';
// express/connect also defaults to looking at env.NODE_ENV

// Override the built-in console methods with winston hooks
var loglevel = env.CAS_VALIDATE_LOGLEVEL || env.LOGLEVEL || 'info'

switch(((env.NODE_ENV) || '').toLowerCase()){
    case 'production':
    production = true
    loglevel='warn'
    logger.add(winston.transports.File,
               {filename: __dirname + '/application.log'
               ,handleExceptions: true
               ,exitOnError: false
               ,level: 'warn'
               ,label: 'cas_validate'
               });
    break
    case 'development':
    loglevel='debug'
    logger.add(winston.transports.Console,
               {colorize: true
               ,timestamp: true
               ,level: loglevel
               ,label: 'cas_validate'
               });
    break
    default:
    logger.add(winston.transports.Console,
               {colorize: true
               ,timestamp: true
               ,level: loglevel
               ,label: 'cas_validate'
               });
    break
    // make loglevels consistent
}
logger.setLevels(winston.config.syslog.levels);

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

function check_or_redirect(options){
    // if no session, and no ticket in request, then redirect;
    // service param is optional, will default to whatever URL is used in the request

    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('no CAS host specified');

    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    var gateway = options.gateway; // default to false

    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){

            // okay, pass control
            logger.debug('have session and session.st')

            return next();
        }

        // still here? redirect to CAS server
        var service = opt_service ? opt_service : determine_service(req)
        var queryopts = {'service':service};
        if(gateway){
            queryopts.gateway = gateway;
        }
        logger.debug('no current session, redirecting to CAS server') ;
        // previous version had an if here, with a 403 if request was
        // a json, but that never worked anyway

        res.writeHead(307, { 'location': cas_host+login_service
                              +'?'
                              +querystring.stringify(queryopts)
                           });
        return res.end();
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
    var gateway = options.gateway; // default to false
    return function(req,res,next){
        //  redirect to CAS server
        var service = opt_service ? opt_service : determine_service(req)
        var queryopts = {'service':service};
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
        var service = opt_service ? opt_service : determine_service(req)
        var cas_uri =  logouturl+'?'
                    +querystring.stringify({'service':service})
        req.session.destroy(function(err){
            if(err){
                logger.error(err)
            }
        });
        res.writeHead(307, { 'location': cas_uri });
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


function ticket(options){

    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('no CAS host specified');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';

    return function(req,res,next){
        var url = parseUrl(req.url,true);

        if(url.query === undefined || url.query.ticket === undefined){
            logger.debug('moving along, no ticket');
            return next();
        }
        logger.debug('have ticket')

        // prevent double checking.  issue #5
        if(req.session.ticket !== undefined
          && req.session.ticket == url.query.ticket){
            logger.debug('ticket already checked')
            // strip the ticket and redirect back
            delete url.query.ticket
            delete url.search
            console.log(url)
            var redir = formatUrl(url)
            console.log(redir)
            res.writeHead(307,{'location':redir});
            //  // I want to do something like this, but with a computed service
            //  // to get rid of the ticket in the url
            res.end();

            //return next()
            return null
        }
        logger.debug('checking ticket')
        req.session.ticket = url.query.ticket
        // have a ticket, try to set up a CAS session
        var service = opt_service ? opt_service : determine_service(req)

        // validate the service ticket
        var ticket = url.query.ticket;
        var cas_uri =  cas_host+validation_service
                    +'?'
                    +querystring.stringify(
                        {'service':service,
                         'ticket':ticket});
        logger.debug('firing: '+cas_uri)
        var saxparser = new libxmljs.SaxParser()
        var usercharhandler=function(chars){
            if(req.session.name){
                req.session.name += chars
            }else{
                req.session.name = chars
            }
            return null
        }

        saxparser.on('startElementNS',function(elem, attrs, prefix, uri, namespaces) {
            if(elem === 'authenticationSuccess'){
                logger.debug('auth passed ');
                req.session.st = ticket;
                // stuff into a redis session for single sign off
                redclient.set(ticket,req.sessionID);
            }
            if(elem==='authenticationFailure'){
                //console.log({'attrs':attrs})
                var attr = attrs[0]
                if(attr[0]==='code' && attr[3]==='INVALID_TICKET'){
                    logger.debug('auth failed') ;
                    console.log('auth failed')
                }
            }
            if(elem==='user'){
                // valid user
                saxparser.on('characters',usercharhandler)
            }
        })

        saxparser.on('endElementNS',function(elem, attrs, prefix, uri, namespaces) {
            // could also use once above, but this is safer
            if(elem==='user'){
                // turn off user chars handler
                saxparser.removeListener('characters',usercharhandler)
            }
        })
        saxparser.on('endDocument',function(){
            // strip the ticket and redirect back
            if(url.query.ticket){
                delete url.query.ticket
                delete url.search
            }
            // the above is okay, but fails.  the below is really heavy handed.
            // var redir = determine_service(req)
            var redir = formatUrl(url)
            res.writeHead(307,{'location':redir});
             // I want to do something like this, but with a computed service
             // to get rid of the ticket in the url
            res.end();

        })

        request({uri:cas_uri}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                saxparser.parseString(body)
            }else{
                // not sure what is up, pass along
                // okay, not logged in, but don't get worked up about it
                return next()
            }
            return null;

        });
        return null
    }
}


/**
 * force_protocol
 *
 * this function will force all host end points to have https protocol
 * If you are running CAS behind http, too bad for you
 *
 */
function force_protocol(url) {
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    // if if does include http, then force it to be https
    if(url === undefined) return chost
    var urlp = parseUrl(url);
    var result = urlp.host === undefined || !urlp.host
               ? 'https://'+urlp.href
               : 'https://'+urlp.host
    // urlp.host takes care of funky ports too, but might not exist
    return result
}

/**
 * determine_protocol
 *
 * ideas copied and modified from Express framework
 * Copyright (c) 2009-2011 TJ Holowaychuk <tj@vision-media.ca>
 * (The MIT License)
 *
 * @return {String}
 * @api public
 */
function determine_protocol(req){

    // this following isn't documented in node.js api, but it is in
    // the tls code.  in other words, it is fragile and might break,
    // but if it does, express breaks too, and everybody is going to
    // hear about it
    var encrypted_connection =  req.connection.encrypted
    if(encrypted_connection) return 'https'


    // from the express stuff, the other thing that needs to be
    // checked is the proxy status however, I might not be running
    // under express, and I don't have an app I can hook into fer
    // shure
    // so ... tree of ifs
    if(req.app !== undefined){
        var trustProxy = req.app.get('trust proxy')
        if(trustProxy) return (req.get('X-Forwarded-Proto') || 'http')
    }
    return 'http'
}

function determine_service(req){

    var url = parseUrl(req.url,true);
    if(url.protocol === undefined) url.protocol = determine_protocol(req)
    url.host = req.headers.host
    return url.protocol+'://'+url.host+url.pathname

}

exports.redirect = redirect;
exports.check_or_redirect = check_or_redirect;
exports.check_and_return = check_no_redirect;
exports.ticket = ticket;
exports.ssoff = ssoff;
exports.logout = logout;
exports.username = username;
exports.session_or_abort = session_or_abort;
