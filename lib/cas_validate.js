var urlm = require('url');
var parseUrl = urlm.parse;
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var redis = require("redis");
var winston = require("winston");

var env = process.env;
var chost = process.env.CAS_HOST;
var _ = require('underscore');

/**
 * CAS validate:  validate requests via CAS service tickets
 *
 * Options:
 *
 *   - `service`  the service url we are checking.  probably best to leave it blank
 *   - `cas_host` the CAS host.  will fallback to environment variable CAS_HOST
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */


// set up logging per: https://gist.github.com/spmason/1670196
var util = require('util'),
    winston = require('winston'),
    logger = new winston.Logger(),
    production = (process.env.NODE_ENV || '').toLowerCase() === 'production';
 
// Override the built-in console methods with winston hooks
var loglevel = process.env.CAS_VALIDATE_LOGLEVEL || process.env.LOGLEVEL
console.log(process.env.NODE_ENV)
switch(((process.env.NODE_ENV+loglevel) || '').toLowerCase()){
    case 'production':
        production = true;
        logger.add(winston.transports.File, {
            filename: __dirname + '/application.log',
            handleExceptions: true,
            exitOnError: false,
            level: 'warn'
        });
        break;
    case 'test':
        // Don't set up the logger overrides
        break;
    default:
        logger.add(winston.transports.Console, {
            colorize: true,
            timestamp: true,
            level: loglevel || 'info',
            label: 'cas_validate'
        });
        break;
    // make loglevels consistent
}
logger.setLevels(winston.config.syslog.levels);
 
function formatArgs(args){
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}
 
console.log = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.info = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.warn = function(){
    logger.warn.apply(logger, formatArgs(arguments));
};
console.error = function(){
    logger.error.apply(logger, formatArgs(arguments));
};
console.debug = function(){
    logger.debug.apply(logger, formatArgs(arguments));
};

console.debug('LOGLEVEL is',loglevel || 'info')
console.log('LOGLEVEL is',loglevel || 'info')

var redclient = redis.createClient();

redclient.on("error", function (err) {
    console.error("Redis Client Error: " + err);
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
            console.debug('have session.  steady as she goes');
            // okay, pass control
            return next();
        }else{
            console.debug('no session, switch to next route');
            return next('route');//new Error('unauthorized'));
        }
    }
}

function check_or_redirect(options){
    // if no session, and no ticket in request, then redirect;
    // service param is optional, will default to whatever URL is used in the request

    var cas_host = force_protocol(options.cas_host ? options.cas_host : chost);
    if (! cas_host ) throw new Error('no CAS host specified');
    console.debug("CAS HOST IS "+cas_host);

    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    var gateway = options.gateway; // default to false

    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){

            // okay, pass control
            console.debug('have session and session.st')

            return next();
        }

        // still here? redirect to CAS server
        var url = parseUrl(req.url,true);
        var service = opt_service ? opt_service :
            'http://'+req.headers.host + url.pathname;
        var queryopts = {'service':service};
        if(gateway){
            queryopts.gateway = gateway;
        }
        console.debug('no current session, redirecting to CAS server') ;
        // previous version had an if here, with a 403 if request was
        // a json, but that never worked anyway
        var serv = urlm.parse(cas_host+login_service+'?'
                            +querystring.stringify(queryopts));
        
        var ss = urlm.format(serv);
        console.debug("REDIRECTING -> "+ss);

        res.writeHead(307, { 'location': ss/*cas_host+login_service
                              +'?'
                              +querystring.stringify(queryopts)*/
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

    var cas_host = force_protocol(options.cas_host ? options.cas_host : chost);
    if (! cas_host ) throw new Error('no CAS host specified');
    console.debug('CAS_HOST',cas_host)

    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    var gateway = options.gateway; // default to false
    return function(req,res,next){
        //  redirect to CAS server
        var url = parseUrl(req.url,true);
        var service = opt_service ? opt_service :
            'http://'+req.headers.host + url.pathname;
        var queryopts = {'service':service};
        if(gateway){
            // prevent an infinite loop
            if(req.session.gateway !== undefined){
                console.debug('gateway already checked: '+req.session.gateway)
                return next()
            }
            console.debug('gateway check to be done')
            req.session.gateway = true
            queryopts.gateway = gateway;
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
    var cas_host = force_protocol(options.cas_host ? options.cas_host : chost);
    if (! cas_host ) throw new Error('no CAS host specified');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    return function(req,res,next){
        // for logging out directly
        // I'd use async.parallel here, but no real need
        var logouturl = chost + '/cas/logout';
        var service = opt_service ? opt_service :
            'http://'+req.headers.host
        var cas_uri =  logouturl+'?'
                    +querystring.stringify({'service':service})
        req.session.destroy(function(err){
            if(err){
                console.error("Error destroying session on logout")
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
    console.debug('scanning post for ssoff')
    for( var param in req.body){
        console.debug("post: "+param+" :===: "+req.body[param]);
        if(/<samlp:SessionIndex>(.*)<\/samlp:SessionIndex>/.exec(req.body[param])){
            var st = RegExp.$1;
            console.debug('ssoff requested for st: %s',st)
            redclient.get(st,function(err,sid){
                if(!err){
                    req.sessionStore.destroy(sid,function(err){
                        if(err){
                            console.debug('error destroying session store')
                        }
                    });
                    console.debug('st [%s] FOUND...removing from datastore',st)
                    redclient.del(st);
                } else {
                    console.debug('st [%s] not found in datastore...ignore',st)
                }
            });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end();
            return null;
        } else {
            console.debug("body doesn't contain ssoff message");
        }
    }
    next(new Error('Unauthorized'));
    return null;
};


function ssoff(){
    return function(req,res,next){
        console.debug('in ssoff')
        var method = req.method.toLowerCase();
        if (method == 'post'){
            console.debug('evaluating post for ssoff')
            return invalidate(req,res,next);
        }else{
            next();
        }
        return null;
    }
}

function ticket(options){

    var cas_host = force_protocol(options.cas_host ? options.cas_host : chost);
    if (! cas_host ) throw new Error('no CAS host specified');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';

    return function(req,res,next){
        var url = parseUrl(req.url,true);

        if(url.query === undefined || url.query.ticket === undefined){
            console.debug('moving along, no ticket');
            return next();
        }
        console.debug('have ticket')
        // have a ticket, try to set up a CAS session
        var service = opt_service ? opt_service :
            'http://'+req.headers.host + url.pathname;

        // validate the service ticket
        var ticket = url.query.ticket;
        var cas_uri =  cas_host+validation_service
                    +'?'
                    +querystring.stringify(
                        {'ticket':ticket,
                         'service':service
                         });
        console.debug('firing: '+cas_uri)
        request({uri:cas_uri}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if(/cas:authenticationSuccess/.exec(body)){
                    console.debug('auth passed ');
                    // stuff the cookie  into a session
                    // and store the ticket as well

                    // valid user
                    if(/<cas:user>(\w+)<\/cas:user>/.exec(body)){
                        req.session.name = RegExp.$1;
                    }
                    req.session.st = ticket;

                    // stuff into a redis session
                    redclient.set(ticket,req.sessionID);
                    next();
                    //res.writeHead(307,{'location':service});
                    //res.end();
                }else{
                    console.debug('something else!' + body)
                    next('route')
                }

            }else{
                console.debug('auth failed') ;
                // okay, not logged in, but don't get worked up about it
                next(new Error('authentication failed'));
            }
            return null;

        });
        return null
    }
}

function force_protocol(url) {
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    var urlp = parseUrl(url);
    if ( urlp.protocol === undefined ) {
        console.debug( 'FORCING PROTOCOL: https://'+url);
        return 'https://'+url;
    } else {
        console.debug( 'NOT FORCING PROTOCOL, USING URL: '+url);
        return url
    }
}


exports.redirect = redirect;
exports.check_or_redirect = check_or_redirect;
exports.check_and_return = check_no_redirect;
exports.ticket = ticket;
exports.ssoff = ssoff;
exports.logout = logout;
exports.username = username;
exports.session_or_abort = session_or_abort;

