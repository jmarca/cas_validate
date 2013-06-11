/*global require process console JSON __dirname */
var parseUrl = require('url').parse
var formatUrl = require('url').format
var http = require('http')
var request = require('request')
var querystring = require('querystring')
var redis = require("redis")
var _ = require('underscore')

var force_protocol=require('./force_protocol')

/**
 * CAS validate:  validate requests via CAS service tickets
 *
 * Options:
 *
 *   - `serivce`  the service url we are checking.  probably best to leave it blank
 *   - `cas_host` the CAS host.  will fallback to environment variable CAS_HOST
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */


var logger = require('./logger')('cas_validate')

var redclient = redis.createClient();

redclient.on("error", function (err) {
    logger.error("Redis Client Error: " + err);
});

// these should be settable options
var validation_service = '/cas/serviceValidate';
var login_service = '/cas/login';



function session_or_abort(){
    return function(req,res,next){
        if(req.session !== undefined  && req.session.st){
            logger.debug('have session.  steady as she goes');
            // okay, pass control
            return next();
        }else{
            logger.debug('no session, switch to next route');
            return next('route');
        }
    }
}

exports.redirect = redirect;
exports.check_or_redirect = require('./check_or_redirect')
exports.check_and_return = check_no_redirect;
exports.ticket = require('./ticket')
exports.ssoff = require('./ssoff')
exports.logout = require('./logout')
exports.get_username = require('./sax_parser').get_username
exports.get_attributes = require('./sax_parser').get_attributes
exports.session_or_abort = session_or_abort;
