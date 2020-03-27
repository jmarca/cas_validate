"use strict";

//const { promisify } = require('util');

var parseUrl = require('url').parse
var querystring = require('querystring')
var logger = require('./logger')('cas_validate::ticket')
var force_protocol=require('./force_protocol')
const got = require('got')
const xmlparser = require('./xml_parser')

function ticket(options){

    const cas_host = force_protocol(options.cas_host,options.cas_port)

    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(opt_service === undefined){
        throw new Error('API change. The service parameter is now required in the options object because guessing the service from the request header is a security bug')
    }
    var login_service = options.login_service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(login_service === undefined){
        // for now, just go with standard path, but perhaps throw here too?
        login_service = '/cas/login'
        logger.info('setting login service endpoint on CAS server to '+login_service)
    }
    var validation_service = options.validation_service;
    if(validation_service === undefined){
        // for now, just go with standard path, but perhaps throw here too?
        validation_service = '/cas/serviceValidate'
        logger.info('setting validation service endpoint on CAS server to '+validation_service)
    }

    return function(req,res,next){
        var url = parseUrl(req.url,true);
        if(url.query === undefined || url.query.ticket === undefined){
            logger.debug('moving along, no ticket');
            return next();
        }
        logger.debug('have ticket in query')
        if(req.session.st){
            // have session, so move along)
            logger.debug('session still valid, do not reparse ticket')
            return next()
        }
        // prevent double checking.  issue #5
        if(req.session.ticket !== undefined
          && req.session.ticket === url.query.ticket){
            logger.debug('ticket already checked')
            // tried various ways to strip the ticket and redirect
            // back, but they all failed, as the browser kept clearing
            // the session
            // so live with the ticket in the URL
            return next()
        }
        logger.debug('checking ticket')

        // validate the ticket.
        //
        // MUST begin with the characters, "ST-", and must be between
        // 32 and 256 characters in length.  Unclear is 32 includes
        // the ST- characters, so allow for it
        //

        if(!/^ST-.{28,256}$/.test(url.query.ticket)){
            var queryopts = {'service':opt_service};
            res.writeHead(307, { 'location': cas_host+login_service
                                           +'?'
                                           +querystring.stringify(queryopts)
                               });
            res.end()
            // res.statusCode = 400
            // res.end('Invalid service ticket. Contact the Central Authentication Service  server administrator')
            return null
        }
        // at this point, the above regex has validated the ticket, so it is okay to pass on as is to the CAS server
        // validate the service ticket
        var ticket = url.query.ticket;
        req.session.ticket = ticket // for next time, to prevent double checks
        var cas_uri =  cas_host+validation_service
                    +'?'
                    +querystring.stringify(
                        {'service':opt_service,
                         'ticket':ticket});
        logger.debug('make xml parser for response')
        const my_parser = xmlparser.make_xml_parser(req,res,next)

        const use_resolved = (response)=>{
	    logger.error('statusCode: '+response.statusCode);
	    logger.error('body: '+ response.body);
            return my_parser(response.body)
        }
        const handle_reject = (error)=>{
            // probably not logged in, but don't get worked up about it
	    logger.error('error trying to check ticket: '+ error);
            return next()
        }
        logger.debug('firing:   '+cas_uri)
        logger.debug('sameish?: https://cas/cas/serviceValidate?service=http%3A%2F%2Fwww.example.org%2Fservice&ticket=ST-1856339-aA5Yuvrxzpv8Tau1cYQ7')
        const res_promise = got(cas_uri,
                                {'rejectUnauthorized': false,}).then(use_resolved,handle_reject)
              .catch((error)=>{
                  logger.error('caught error outside of handlers: '+error)
                  return next()
              })

        return res_promise

    }
}

module.exports=ticket
