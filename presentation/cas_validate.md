% Node.js and CAS validation
% James E. Marca
% June 2013

--------------------

![](figs/who_are_you.png)\


------------------

# Hello, my name is James

* Transportation engineering PhD
* Research scientist with UCI ITS[^1]
* https://github.com/jmarca
* http://contourline.wordpress.com
* james@activimetrics.com

[^1] Until July 1!

--------------

# CAS

Everybody here knows more about CAS than I do.

This talk is about *using* CAS

# CAS + ldap

* We used to use Drupal for our research group's website
* We used Drupal to create accounts
* Drupal used ldap and CAS
* So we used ldap and CAS

------------------

# Single Sign-on, Single Sign-off

A picture here

Publicity website  <-->  Project websites

We want to log in to the public portal, and then keep that login for
all of the individual project websites, developed by independent
researchers.

We tried and failed in past years to require everybody to use
*X*

----------------------

# I use node.js

JavaScript on the server.

Fast because V8 is fast

Clean, single-threaded non-blocking design

What's not to like?

----------------------

# CAS support in node.js

The node.js packaging system is npm.

npm search cas:  lots of options

none supported single sign out

----------------------

# Excellent ldapjs

## (Drop this slide)

There is an excellent ldap library developed by the Riak guys

We wrote some small adapters to allow us to manipulate our ldap
directory from node.js

----------------------

# CAS Validate

* repository:  https://github.com/jmarca/cas_validate
* installation: npm install cas_validate
* a plugin to Express and Connect

---------------------

# Program flow

This is a figure, probably

Express is route based

For basic hello, just check if logged in, but don't require a login.

For access to restricted areas, require a login, and maybe check
permissions, etc

A login here is a login everywhere, and vice versa

A logout here is a logout everywhere, and vice versa

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

```
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
```
var querystring = require('querystring')
var cas_host = 'https://my.cas.host' // configurable
var login_service = '/cas/login'     // oops, hardcoded!

var redirecter = function (req,res,next){
    // decide endpoint where CAS server will return
    var service = determine_service(req)
    var queryopts = {'service':service}
    res.writeHead(307, { 'location': cas_host+login_service
                          +'?'
                          +querystring.stringify(queryopts)
                       })
    return res.end()
}
```

-----------------------------

# Listen for CAS reply

-----------------------------

```
var ticket_check = function(req,res,next){
    var url = parseUrl(req.url,true);
    if(url.query === undefined || url.query.ticket === undefined){
        logger.debug('moving along, no ticket');
        return next(); // move along to the next route
    }
    logger.debug('have ticket')
    // store the ticket in the session
    req.session.ticket = url.query.ticket
    ...

```
-----------------------------

# Check ticket validity

* The trickiest part

   * Use connect.cookieParser,
    connect.session, with connect-redis)
