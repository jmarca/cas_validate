const querystring = require('querystring')
const logger = require('./logger')('cas_validate::check_or_redirec')
const force_protocol=require('./force_protocol');

function check_or_redirect(options){
    // if no session, and no ticket in request, then redirect;
    // service param is optional, will default to whatever URL is used in the request
    console.log(options.cas_host)
    const cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');
    const cas_port = options.cas_port || 8443

    const opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(opt_service === undefined){
        throw new Error('API change. The service parameter is now required in the options object because guessing the service from the request header is a security bug')
    }
    const gateway = options.gateway; // default to false
    const login_service = options.login_service === undefined ?
          '/cas/login' :
          options.login_service;
    logger.info('setting login service endpoint on CAS server to ',login_service)

    const cas_target = cas_host+':'+cas_port + login_service
    console.log('cas target is',cas_target)
    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){

            // okay, pass control
            logger.debug('have session and session.st')

            return next();
        }

        // still here? redirect to CAS server
        const queryopts = {'service':opt_service};
        if(gateway){
            queryopts.gateway = gateway;
        }
        logger.debug('no current session, redirecting to CAS server') ;
        // previous version had an if here, with a 403 if request was
        // a json, but that never worked anyway

        res.writeHead(307, { 'location': cas_target
                              +'?'
                              +querystring.stringify(queryopts)
                           });
        return res.end();
    }
}
module.exports=check_or_redirect
