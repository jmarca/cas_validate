var parseUrl = require('url').parse
var querystring = require('querystring')
var logger = require('./logger')('cas_validate::ticket')
var force_protocol=require('./force_protocol')
var request = require('request')

function ticket(options){

    var cas_host = force_protocol(options.cas_host)
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

        if(!/^ST-.{29,256}$/.test(url.query.ticket)){
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

        // have a ticket, try to set up a CAS session

        // validate the service ticket
        var ticket = url.query.ticket;
        req.session.ticket = ticket // for next time, to prevent double checks
        var cas_uri =  cas_host+validation_service
                    +'?'
                    +querystring.stringify(
                        {'service':opt_service,
                         'ticket':ticket});
        logger.debug('firing: '+cas_uri)


        request({uri:cas_uri}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              var parseString = require('xml2js').parseString;
              parseString(body, function(err, result) {

                if (!err) {
                  var authResult = result['cas:serviceResponse'];

                  if (authResult['cas:authenticationSuccess']) {
                    var success = authResult['cas:authenticationSuccess'][0];
                    req.session.st = req.session.ticket;
                    req.session.name = success['cas:user'][0];
                    req.session.attributes = {};
                    success['cas:attribute'].forEach(function(attr) {
                      if (!req.session.attributes[attr.$.name])
                        req.session.attributes[attr.$.name] = [];
                      req.session.attributes[attr.$.name].push(attr.$.value);
                    });
                  }
                  else {
                    logger.debug('auth failed');
                    delete req.session.st;
                    delete req.session.attributes;
                    var failure = authResult['cas:authenticationFailure'][0];
                    if (failure.$.code)
                      logger.debug(failure.$.code);
                  }
                }

                next();
              });

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

module.exports=ticket
