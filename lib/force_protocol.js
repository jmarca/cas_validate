var parseUrl = require('url').parse
var cas_host = process.env.CAS_HOST || 'localhost';
var secure_cas_host = _protocol(cas_host)
var logger = require('./logger')('cas_validate::force_protocol')

logger.debug('secure_cas_host is',secure_cas_host)

/**
 * force_protocol
 *
 * this function will force all host end points to have https protocol
 * If you are running CAS behind http, too bad for you
 *
 */

function _protocol(url){
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    // if if does include http, then force it to be https

    // parseUrl will treat host:port as protocol:host, so we have to manually
    // add https string if it's not there
    if ( !url.match(/^http/) ) url = 'https://'+url;
    var urlp = parseUrl(url)
    var result = urlp.host === undefined || !urlp.host
               ? 'https://'+urlp.href
               : 'https://'+urlp.host
    // urlp.host takes care of funky ports too, but might not exist
    return result
}

function force_protocol(url){
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    // if if does include http, then force it to be https
   var ret
   if(url === undefined) ret = secure_cas_host
   else ret = _protocol(url)
   logger.debug('forced protocol',url,ret)
   return ret
}

module.exports=force_protocol
