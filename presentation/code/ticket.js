var parseUrl = require('url').parse
var formatUrl = require('url').format



var ticket_check = function(req,res,next){
    var url = parseUrl(req.url,true);

    if(url.query === undefined || url.query.ticket === undefined){
        logger.debug('moving along, no ticket');
        return next();
    }
    logger.debug('have ticket')

        // prevent double checking.  issue #5
        if(req.session.ticket !== undefined
          && req.session.ticket == url.query.ticket){
            logger.debug('ticket already checked')
            // strip the ticket and redirect back
            delete url.query.ticket
            delete url.search
            console.log(url)
            var redir = formatUrl(url)
            console.log(redir)
            res.writeHead(307,{'location':redir});
            //  // I want to do something like this, but with a computed service
            //  // to get rid of the ticket in the url
            res.end();

            //return next()
            return null
        }
        logger.debug('checking ticket')
        req.session.ticket = url.query.ticket
        // have a ticket, try to set up a CAS session
        var service = opt_service ? opt_service : determine_service(req)

        // validate the service ticket
        var ticket = url.query.ticket;
        var cas_uri =  cas_host+validation_service
                    +'?'
                    +querystring.stringify(
                        {'service':service,
                         'ticket':ticket});
        logger.debug('firing: '+cas_uri)
        var saxparser = new libxmljs.SaxParser()
        var usercharhandler=function(chars){
            if(req.session.name){
                req.session.name += chars
            }else{
                req.session.name = chars
            }
            return null
        }

        saxparser.on('startElementNS',function(elem, attrs, prefix, uri, namespaces) {
            if(elem === 'authenticationSuccess'){
                logger.debug('auth passed ');
                req.session.st = ticket;
                // stuff into a redis session for single sign off
                redclient.set(ticket,req.sessionID);
            }
            if(elem==='authenticationFailure'){
                //console.log({'attrs':attrs})
                var attr = attrs[0]
                if(attr[0]==='code' && attr[3]==='INVALID_TICKET'){
                    logger.debug('auth failed') ;
                    console.log('auth failed')
                }
            }
            if(elem==='user'){
                // valid user
                saxparser.on('characters',usercharhandler)
            }
        })

        saxparser.on('endElementNS',function(elem, attrs, prefix, uri, namespaces) {
            // could also use once above, but this is safer
            if(elem==='user'){
                // turn off user chars handler
                saxparser.removeListener('characters',usercharhandler)
            }
        })
        saxparser.on('endDocument',function(){
            // strip the ticket and redirect back
            if(url.query.ticket){
                delete url.query.ticket
                delete url.search
            }
            // the above is okay, but fails.  the below is really heavy handed.
            // var redir = determine_service(req)
            var redir = formatUrl(url)
            res.writeHead(307,{'location':redir});
             // I want to do something like this, but with a computed service
             // to get rid of the ticket in the url
            res.end();

        })

        request({uri:cas_uri}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                saxparser.parseString(body)
            }else{
                // not sure what is up, pass along
                // okay, not logged in, but don't get worked up about it
                return next()
            }
            return null;

        });
        return null
    }
}
