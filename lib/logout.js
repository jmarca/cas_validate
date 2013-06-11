var force_protocol=require('./force_protocol')
var querystring = require('querystring')
var logger = require('./logger')('cas_validate')
var clear_st = require('./ticket_store').clear_st

function logout(options){
    var cas_host = force_protocol(options.cas_host)
    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    return function(req,res,next){
        // for logging out directly
        // I'd use async.parallel here, but no real need
        var logouturl = cas_host + '/cas/logout';
        if(opt_service){
            logouturl+='?'+querystring.stringify({'service':opt_service})
        }
        // may as well delete session from redis as well this will
        // duplicate the POST from CAS, but better to take care of it
        // now than rely on all that jazz to work properly later
        if(req.session.st !== undefined){
            clear_st(req.session.st,req,function(){
                res.writeHead(307, { 'location': logouturl });
                res.end()
            })
        }else{
            req.session.destroy(function(err){
                if(err){
                    logger.error(err)
                }
                res.writeHead(307, { 'location': logouturl });
                res.end()
            })
        }
        return null
    }
}
