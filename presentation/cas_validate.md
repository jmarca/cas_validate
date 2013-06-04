% Node.js and CAS validation
% James E. Marca
% June 2013

--------------------

![](figs/who_are_you.png)\


------------------

# Hello, my name is James

* Transportation engineering PhD
* Research scientist with UCI ITS
* https://github.com/jmarca
* http://contourline.wordpress.com
* james@activimetrics.com



--------------

# CAS

Everybody here knows more about CAS than I do.

This talk is about *using* CAS

--------------

# Use case:  CAS + ldap

* Used to use Drupal
* Drupal was set up to use ldap and CAS
* So we used ldap and CAS

------------------

# Single sign on, single sign off

* Caltrans sponsors liked the website, but
* They didn't like signing in again to project sites
* Need single sign on, sign off

----------------------

# I use node.js

* JavaScript on the server.
* Fast because V8 is fast
* Clean, single-threaded non-blocking design
* What's not to like?

----------------------

# CAS support in node.js

* The node.js packaging system is npm.
* `npm search cas`:  lots of options
* but none supported single sign out

----------------------

# CAS Validate

* repository:  https://github.com/jmarca/cas_validate
* installation: npm install cas_validate
* a plugin to [Express](http://www.expressjs.com/) and [Connect](http://senchalabs.github.com/connect/)

---------------------

# Program requirements

* Fixme Figure
* Express is route based
* public routes:
  * check if logged in,
  * but don't *require* a login.
* restricted routes:
  * require a login,
  * maybe check permissions, etc

-----------------------

# Single Sign On

* A login here is a login everywhere, and vice versa
* A logout here is a logout everywhere, and vice versa

------------------------

# CAS documentation is excellent

Thanks

-------------------------

# Basic login task

1. establish a session with the client
2. ask the client to redirect to the CAS server
3. expect a reply back from the CAS server with a ticket
4. check the ticket's validity directly with the CAS server

-----------------------------

# Establish a session with a client

* use standard connect/express middleware

-----------------------------

``` language-javascript
var express = require('express')
var RedisStore = require('connect-redis')(express);
var app = express()
app
 .use(express.logger({buffer:5000}))
 .use(express.bodyParser())
 .use(express.cookieParser('tall barley defeated napoleon'))
 .use(express.session({ store: new RedisStore }))

```

-----------------------------

# Redirect to CAS server

* more complicated, but still easy

-----------------------------

## Prerequisites:

``` language-javascript
var querystring = require('querystring')
// configurable
var cas_host = 'https://my.cas.host'
var login_service = '/cas/login'
```

----------------------------

``` language-javascript
var redirecter = function (req,res,next){
    // decide endpoint where CAS server
    // will return to
    var service = determine_service(req)
    var queryopts = {'service':service}
    res.writeHead(307,
        { 'location': cas_host+login_service +'?'
                      +querystring.stringify(queryopts)
        })
    return res.end()
}
```

-----------------------------

# Listen for CAS reply

* parse incoming query for `ticket` parameter


-----------------------------

``` language-javascript
var ticket_check = function(req,res,next){
    var url = parseUrl(req.url,true);
    if(url.query === undefined || url.query.ticket === undefined){
        logger.debug('moving along, no ticket');
        return next(); // move along to the next route
    }
    logger.debug('have ticket')
```

-----------------------------

# Check ticket validity

* Ticket is "one time use"
* Directly connect with CAS server to check validity of ticket
* Using the Request library
* Cheating! Using regular expressions to parse response
* Redis:  use Redis to pair ticket and session

------------------------------

## Prerequisites:

``` language-javascript

var cas_host = 'https://my.cas.host' // configurable
var validation_service = '/cas/serviceValidate'
var redclient = redis.createClient();

```

------------------------------

``` language-javascript
var ticket = url.query.ticket;
var service = opt_service ? opt_service : determine_service(req)

var cas_uri =  cas_host+validation_service +'?'
     +querystring.stringify({'service':service,'ticket':ticket});
request({uri:cas_uri}, callback)
    return null;
});
```

------------------------------

``` language-javascript
function callback(error, response, body) {
    if (!error && response.statusCode === 200) {
        if(/cas:authenticationSuccess/.exec(body)){
            if(/<cas:user>(\w+)<\/cas:user>/.exec(body)){
                req.session.name = RegExp.$1;
            }
            req.session.st = ticket;
            redclient.set(ticket,req.sessionID);
            next();
        }else{
            next(new Error('authentication failed'));
        }
    }else{
        next(new Error('authentication failed'));
    }

```
