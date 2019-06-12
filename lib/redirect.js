const parseUrl = require('url').parse
const querystring = require('querystring')
const logger = require('./logger')('cas_validate::redirect')
const force_protocol=require('./force_protocol')


/**
 * check_and_return
 *
 * invokes the redirect function, below, but with the gateway option set to true
 *
 * returns whatever redirect returns
 *
 * @param {object} options : options to pass to redirect.  will be extended with {'gateway':true}
 * @return {function} a function to be used in a connect or express handler
 *
 */
function check_and_return(options){
    const extended_options = Object.assign(options, {'gateway':true});
    return redirect(extended_options);
}

/**
 * redirect
 *
 * sent the incoming request to the CAS server for processing.
 *
 * options:
 * 'cas_host':  required, or set as environment variable CAS_HOST.  will throw if not supplied
 * 'service' : required. Figuring this out from the request headers is
 *             possible, but a security hole, as the headers can be spoofed
 * 'gateway' : optional.  if true, will send the request param 'gateway=true' to the CAS server
 * 'login_service' : optional, defaults to the CAS standard path of /cas/login
 *
 * redirect will redirect to the CAS server, and will only come back
 * to "service" upon successful login.  In contrast, setting gateway =
 * true will cause the CAS server to immediately return to "service",
 * with either a service ticket, or not.  This is how one would check
 * if a client has already established a login session with CAS,
 * without *requiring* a login session to be established.  for
 * example, in the front page of a website, if the user is logged in
 * you want to show yo the page and a greeting, but if yo's not logged
 * in, then just show the public page with a login option.
 *
 * the function check_and_return is a wrapper around this function
 * that sets gateway:true in the options object
 *
 * @param {object} options as described above
 * @return {function} a function to use in a connect or express handler, with gateway=true
 *
 */
function redirect(options){
    // redirect to CAS always
    // service param is optional, will default to whatever URL is used in the request
    // set {gateway:true} in the options object to use the CAS gateway functionality
    // or just invoke via the check_and_return function, above

    const cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');
    const cas_port = options.cas_port || 8443

    const opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    if(opt_service === undefined){
        throw new Error('API change. The service parameter is now required in the options object because guessing the service from the request header is a security bug')
    }
    const gateway = options.gateway; // default to false
    var login_service = options.login_service; // for example: 'http://safety.ctmlabs.net/OBgeojson';
    if(login_service === undefined){
        // for now, just go with standard path, but perhaps throw here too?
        logger.info('setting login service endpoint on CAS server to /cas/login')
        login_service = '/cas/login'
    }
    const cas_target = cas_host+':'+cas_port + login_service
    console.log('cas target is',cas_target)
    return function(req,res,next){
        //  redirect to CAS server
        const queryopts = {'service':opt_service};
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
        res.writeHead(307, { 'location': cas_target
                              +'?'
                              +querystring.stringify(queryopts)
                           });
        return res.end();
    }
}
exports.redirect=redirect
exports.check_and_return=check_and_return
