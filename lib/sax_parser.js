var libxmljs = require("libxmljs")
var parseUrl = require('url').parse
var redis = require("redis")
var logger = require('./logger')('cas_validate::sax_parser')
var set_session = require('./ticket_store').set_session


function make_sax_parser(req,res,next){
    var saxparser = new libxmljs.SaxParser()
    var errors
    var usercharhandler=function(chars){
    if(req.session.name){
                req.session.name += chars
            }else{
                req.session.name = chars
            }
            return null
        }
        req.session.attributes={}
        var attrcharhandler=function(attrname){
            return function(chars){
                req.session.attributes[attrname]=chars
            }
        }
        var attrhandler=function(e,a,p,u,n){
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

module.exports=make_sax_parser
