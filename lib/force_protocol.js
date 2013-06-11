var parseUrl = require('url').parse
var cas_host = process.env.CAS_HOST;
var secure_cas_host = _protocol(cas_host)

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
    if(url === undefined) return secure_cas_host
    return _protocol(url)
}

module.exports=force_protocol