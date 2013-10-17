var querystring = require('querystring')
var logger = require('./logger')('cas_validate::check_or_redirec')
var force_protocol=require('./force_protocol')

function check_or_redirect(options){
    // if no session, and no ticket in request, then redirect;
    // service param is optional, will default to whatever URL is used in the request

    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');

    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(opt_service === undefined){
        throw new Error('API change. The service parameter is now required in the options object because guessing the service from the request header is a security bug')
    }
    var gateway = options.gateway; // default to false
    var login_service = options.login_service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(login_service === undefined){
        // for now, just go with standard path, but perhaps throw here too?
        login_service = '/cas/login';
        logger.info('setting login service endpoint on CAS server to '+login_service);
    }

    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){

            // okay, pass control
            logger.debug('have session and session.st')

            return next();
        }

        // still here? redirect to CAS server
        var queryopts = {'service':opt_service};
        if(gateway){
            queryopts.gateway = gateway;
        }
        var location = cas_host + login_service + '?' + querystring.stringify(queryopts);
        logger.debug('no current session, redirecting to CAS server:', location) ;
        // previous version had an if here, with a 403 if request was
        // a json, but that never worked anyway

        res.writeHead(307, {location: location});
        return res.end();
    }
}
module.exports=check_or_redirect
