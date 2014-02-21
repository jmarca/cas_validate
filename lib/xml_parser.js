var libxmljs = require("libxmljs")
var parseUrl = require('url').parse
var redis = require("redis")
var logger = require('./logger')('cas_validate::sax_parser')
var set_session = require('./ticket_store').set_session
var _ = require('underscore')

function make_xml_parser(req,res,next){
    var errors
    req.session.attributes={}
    delete req.session.name



    function user_handler(element){
        logger.debug('handling user:' +element.text())
        req.session.name = element.text()
        return null
    }
    function attr_handler(element){
        logger.debug('handling attribute:' +element.name())
        var attrname = element.name()
        if(attrname !== 'text'){
            req.session.attributes[attrname]=element.text()
        }
        return null
    }

    function inline_attr_handler(element){

        var attrname = element.attr('name').value()
        logger.debug('handling attribute:' +attrname)
        if(attrname !== 'text'){
            // some attributes might be arrays
            if(req.session.attributes[attrname] !== undefined){
                req.session.attributes[attrname]=_.flatten([req.session.attributes[attrname],element.attr('value').value()])
            }else{
                req.session.attributes[attrname]=element.attr('value').value()
            }
        }
        return null
    }

    function auth_handler(elem){
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

        var user = elem.find('//cas:user'
                            ,{ 'cas' : 'http://www.yale.edu/tp/cas'}
                            )[0]
        var attributes = elem.find('//cas:attributes'
                                  ,{ 'cas' : 'http://www.yale.edu/tp/cas'}
                                  )[0]
        user_handler(user)
        if(attributes !== undefined){
            _.each(attributes.childNodes(),attr_handler)
        }else{
            // alternate way?
            attributes = elem.find('//cas:attribute'
                                  ,{ 'cas' : 'http://www.yale.edu/tp/cas'}
                                  )
            _.each(attributes,inline_attr_handler)
        }
        return null
    }

    function inauth_handler(elem){
        var code = elem.attr('code')
        if(code !== undefined  && code.value()==='INVALID_TICKET'){
            logger.debug('auth failed') ;
            delete req.session.st
        }
        return null
    }

    function parse(doc,encoding){
        if(!encoding){
            encoding = 'utf-8'
        }
        var xmlDoc = libxmljs.parseXml(doc,encoding)
        var success = xmlDoc.get('/cas:serviceResponse/cas:authenticationSuccess'
                                 ,{ 'cas' : 'http://www.yale.edu/tp/cas'}
                                 )
        var failure = xmlDoc.get('/cas:serviceResponse/cas:authenticationFailure'
                                 ,{ 'cas' : 'http://www.yale.edu/tp/cas'}
                                 )
        if(failure===undefined){
            // success
            auth_handler(success)
        }else{
            // failure
            inauth_handler(failure)
        }
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
    }

    return parse

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

exports.make_xml_parser=make_xml_parser
exports.get_username=get_username
exports.get_attributes=get_attributes
