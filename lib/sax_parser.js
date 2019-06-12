var libxmljs = require("libxmljs2")
var parseUrl = require('url').parse
var logger = require('./logger')('cas_validate::sax_parser')
var set_session = require('./ticket_store').set_session
var _ = require('underscore')

function make_sax_parser(req,res,next){
    var saxparser = new libxmljs.SaxParser()
    var errors
    req.session.attributes={}
    delete req.session.name

    function usercharhandler(chars){
        req.session.name = chars
        return null
    }
    function attrcharhandler(attrname){
        return function(chars){
            req.session.attributes[attrname]=chars
            return null
        }
    }
    function attrhandler(e,a,p,u,n){
        saxparser.once('characters',attrcharhandler(e))
    }

    function startHandler(elem, attrs, prefix, uri, namespaces) {
        if(elem === 'authenticationSuccess'){
            logger.debug('auth passed ');
            req.session.st = req.session.ticket;
            // stuff into a redis session for single sign off
            // set_session(req.session.st,req.sessionID);
            set_session(req,function(err){
                if(err){
                    errors = err
                    return next(err)
                }
                return null
            })
        }
        if(elem==='authenticationFailure'){
            var attr = attrs[0]
            if(attr[0]==='code' && attr[3]==='INVALID_TICKET'){
                logger.debug('auth failed') ;
                delete req.session.st
            }
        }
        if(elem==='user'){
            // valid user
            saxparser.on('characters',usercharhandler)
        }
        if(elem==='attributes'){
            // valid user
            saxparser.on('startElementNS',attrhandler)
        }
        return null
    }
    saxparser.on('startElementNS',startHandler)

    function endHandler(elem, attrs, prefix, uri, namespaces) {

        // could also use once above, but this is safer
        if(elem==='user'){
            // turn off user chars handler
            saxparser.removeListener('characters',usercharhandler)
        }
        if(elem==='attributes'){
            // valid attributes, done
            saxparser.removeListener('startElementNS',attrhandler)
        }
    }
    saxparser.on('endElementNS',endHandler)
    saxparser.on('endDocument',function(){
        // strip the ticket and redirect back
        // // this doesn't work properly
        // if(url.query.ticket){
        //     delete url.query.ticket
        //     delete url.search
        // }
        //
        // the above is okay, but fails because it does nothing.
        // redirecting works, but kills the session, so you end up
        // in a redirect loop.
        //
        // no matter what I try, redirect will kill the session.
        // so just live with the ticket for now until I figure this out
        if(req.session.st){
            logger.debug('parsed xml doc, got:  user name = '+req.session.name+', attributes are: ' +JSON.stringify(req.session.attributes))
            if(!errors){
                next()
            }
        }else{
            // possibly a bad, stale ticket in request
            var url = parseUrl(req.url,true);
            var path = url.pathname
            res.writeHead(307, { 'location': path })
            res.end()
        }
        return null
    })
    return saxparser
}

/**
 * get_username
 *
 * get the user name provided by the CAS server, stored in the current session
 *
 * You can also directly access them at req.session.name, but
 * just in case that changes you can always rely on this to do the
 * right thing
 *
 * will invoke the callback with (error,{'username':username})
 *
 * If there is no username (perhaps you do not have a CAS session),
 * then it will invoke callback with (error,{}) (an empty object)
 *
 * @param {Object} req the http.IncomingMessage (from express or connect)
 * @param {Function} next the callback to invoke with the username object
 * @return {Object} returns whatever next invocation returns
 * @api public
 *
 */
function get_username(req,next){
    if(req.session !== undefined && req.session.name !== undefined){
        return next(null,{'user_name':req.session.name})
    }else{
        return next(null,{})
    }
}

/**
 * get_attributes
 *
 * get the user attributes parsed by xml parser and stored in the
 * session. Also, get the username too while we're at it.
 *
 * You can also directly access them at req.session.attributes, but
 * just in case that changes you can always rely on this to do the
 * right thing
 *
 * will invoke the callback with (error,attributes) attributes will
 * include username as well.  see the documentation above for
 * get_username
 *
 * if there are not attributes, will return only the username object
 *
 * If the attributes are empty and there is no username (perhaps there
 * is not a CAS session for this user), will invoke callback with
 * (error,{}) (an empty object)
 *
 * @param {Object} req the http.IncomingMessage (from express or connect)
 * @param {Function} next the callback to invoke with the attributes
 * @return {Object} returns whatever next invocation returns
 * @api public
 *
 */
function get_attributes(req,next){
    return get_username(req,function(err,obj){
               if(req.session !== undefined && req.session.attributes !== undefined){
                   return next(null,_.extend(obj,req.session.attributes))
               }else{
                   return next(null,obj)
               }
           })
}

exports.make_sax_parser=make_sax_parser
exports.get_username=get_username
exports.get_attributes=get_attributes
