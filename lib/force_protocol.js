const logger = require('./logger')('cas_validate::force_protocol')
var parseUrl = require('url').parse
var cas_host = process.env.CAS_HOST || 'localhost';
var secure_cas_host = _protocol(cas_host)

//logger.debug('secure_cas_host is',secure_cas_host)

/**
 * force_protocol
 *
 * this function will force all host end points to have https protocol
 * If you are running CAS behind http, too bad for you
 *
 */

function _protocol(url,port){
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    // if if does include http, then force it to be https

    // parseUrl will treat host:port as protocol:host, so we have to manually
    // add https string if it's not there
    if ( !url.match(/^http/) ){
        url = 'https://'+url;
        port = port === undefined || !port
            ? 8443 // cas is Java; Java uses 8443
            : port
    }
    // else{
    //    // otherwise, http(s) is specified in url, so maybe the
    //    // port is included in url and/or is passed in
    //    port = port === undefined || !port
    //        ? 8443
    //        : port
    var urlp = parseUrl(url)
    //logger.debug('parsed: url: '+url+ ' as ' + JSON.stringify(urlp))
    if (urlp.port !== undefined && !port){
        port = urlp.port
    }
    // finally
    port = port === undefined || !port
        ? 8443
        : port

    var result = urlp.host === undefined || !urlp.host
        ? 'https://'+urlp.href
        : 'https://'+urlp.host

    if (urlp.port === undefined || !urlp.port ){
        result += ":"+port
    }
    //logger.debug('result is '+result)
    // urlp.host takes care of funky ports too, but might not exist
    return result
}

function force_protocol(url,port){
    // if the given url string doesn't include a protocol (e.g., http://)
    // assume it should be https://
    // if if does include http, then force it to be https
   var ret
   if(url === undefined) ret = secure_cas_host
   else ret = _protocol(url,port)
   //logger.debug('forced protocol: url: '+url+ ', port: '+port +", returning: "+ret)
   return ret
}

module.exports=force_protocol
