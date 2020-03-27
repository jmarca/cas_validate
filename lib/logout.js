var force_protocol=require('./force_protocol')
var querystring = require('querystring')
var logger = require('./logger')('cas_validate::logout')
var clear_st = require('./ticket_store').clear_st

function logout(options){
    var cas_host = force_protocol(options.cas_host,options.cas_port)
    if (! cas_host ) throw new Error('No CAS host specified.  Either include it in the options object {cas_host:"my.cas.host"} or as an environment variable CAS_HOST');
    var opt_service = options.service; // for example: 'http://safety.ctmlabs.net/geojson';
    var logout_service = options.logout_service;
    if(logout_service === undefined){
        // for now, just go with standard path, but perhaps throw here too?
        logout_service = '/cas/logout'
        logger.info('setting logout service endpoint on CAS server to '+logout_service)
    }
    return function(req,res,next){
        // for logging out directly
        // I'd use async.parallel here, but no real need
        var logouturl = cas_host + logout_service;
        if(opt_service){
            logouturl+='?'+querystring.stringify({'service':opt_service})
        }
        // may as well delete session from redis as well this will
        // duplicate the POST from CAS, but better to take care of it
        // now than rely on all that jazz to work properly later
        if(req.session.st !== undefined){
            clear_st(req.session.st,req,function(){
                req.session.destroy(function(err){
                    if(err){
                        logger.error(err)
                    }
                    res.writeHead(307, { 'location': logouturl });
                    res.end()
                })
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
module.exports=logout
