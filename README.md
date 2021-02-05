# CAS Validate

This is a utility to facilitate validating a web service based on
Connect or Express (and perhaps other frameworks or nothing at all)
with a CAS server(<https://www.apereo.org/cas>.  It allows single sign
on and
[single sign out](https://wiki.jasig.org/display/CASUM/Single+Sign+Out).
In other words, if a client has previously logged in to the CAS
server, this library will allow your service to transparently detect
that fact, and if the user subsequently logs off from the CAS server,
this library can handle the subsequent POST message from the CAS
server and log the user out of your service as well.

The need to support single sign out was the original reason I wrote
this library.  Since then I modularized it so that I could apply
different strategies to different services in my Connect and Express
applications.  The original development was conducted when Connect
still had routing capabilities, but all but one feature still works
with the latest Connect, and all features work with Express.

# Request has been deprecated…

As of February 2020, Request has been deprecated.  As cas_validate has
been stuck for years in a state of un-testedness, and as I'm finally
putting in some work trying to remedy that situation, I figure now is
as good a time as any to move on from Request.

And with this push, that work is done.  Tests pass too.

# Testing things and notes on latest updates

I don't use this code in practice anymore, but it has been bothering
me for years that I didn't have a good testing setup.  This past
summer (August 2019) I was able to finally get a CAS server up and
running under Docker.  My repo for that is
[here](https://github.com/jmarca/cas_overlay_template).  I forked the
original `cas_overlay_template` repo and tweaked the gradle compiling
settings in order to enable LDAP authentication.

The testing setup is encapsulated in my `run_docker.sh` file.  This
isn't really a `sh` file, but rather more like a `bashrc` file, in
that it just creates a bunch of functions that run docker commands and
such.

In order to test my code, the idea is that you have to fire up an LDAP
container, a CAS container, and a third node.js container to run this
code.  To make that easy, the `run_docker.sh` command sets up
dependencies between the different containers and container networks.

## Steps to run tests

(Note, I run linux.  I've no idea how to do any of this on Windows,
but a Mac might work out of the box if you have the docker tool chain
installed.)

### Step 0: source the aliases

The zeroth test is to open up a terminal shell window (my daughters
call it "the black box") and source the `run_docker.sh` file, as
follows:

```bash
. run_docker.sh
```

This will load up a bunch of aliases in the current command line
environment.

### Step 1: build the node docker image

The first step is to build the `cas_node_tests` image that can run
this code.  In the same shell in which you source the `run_docker.sh`
file, execute the following command:

```bash
make_cas_node_tests_docker
```

This will build a new docker image using the Dockerfile found in this
repository.  Alternately, you can instead run

```bash
docker build  -t jmarca/cas_node_tests .
```

If all goes well, you should see some complaints about deprecated
node.js libraries, and then the build should finish with something
like:

```
...
Removing intermediate container 86883a14e082
 ---> 987bf3c2c600
Step 10/10 : CMD [ "npm", "start" ]
 ---> Running in 6ca824e68aa2
Removing intermediate container 6ca824e68aa2
 ---> 012985a8c476
Successfully built 012985a8c476
Successfully tagged jmarca/cas_node_tests:latest
```


### Step 2: fire up the test environment

Once the needed container is built, the idea is to launch a shell
inside of that container that lets you run the tests.  To do that,
simply execute the function `cas_node_test`:

```bash
cas_node_test
```

This should start a few needed networks, start some containers, and
then load the `cas_node_tests` container that was built in the
previous step.  The output should look like this:

```
james at farfalla in ~/repos/jem/cas_validate on master [!?]
$ cas_node_test
Error response from daemon: No such container: cas_node_tests
cas_nw is not up, starting it for you.
a69d66d35df366171531e383192184ee2d3223b84072a8000e639d14098d8a88
redis_nw is not up, starting it for you.
ceadfcf1f57c5de6829e02abcc0063cee9a97001162313762f093665ce1f4da4
cas is not running, starting it for you.
openldap is not running, starting it for you.
openldap_nw is not up, starting it for you.
0b0fcde7c60a29067ea2b632e3833fc7fe6826d668c1fc7f7e09bbc0c0cde2a8
f22f322d21d6538b5dfbe26ef7fbb877ca272828312f77db28341e5893fa298d
1555ed92e3bff10b4930876e7b2c43f79192a12dd0ccabcf948f042a5a2c25d2
cas
redis is not running, starting it for you.
1ce014d22a29f9f9dcd451f371dd17bc1d6787fd69bd75c744ed266f5d23dd18
934ef10dc7053ff31be53360e1cc5100236014b76d5485cb289b044a274627d2
cas_node_tests
bash-5.0$
```

The final prompt means you're in bash, ready to run the tests.  The
build command should have installed all the node libraries, but just
in case, install them, then run the tests:

```
bash-5.0$ npm install
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.1.2 (node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.1.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})

audited 1719 packages in 2.341s

19 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
bash-5.0$ npm test

> cas_validate@0.1.9 test /usr/src/dev
> NODE_ENV='test' tap test/**/*-test*.js --cov

test/01-test-loadup.js 1> in ticket store, redishost is redis
test/01-test-loadup.js 1> {"message":"setting login service endpoint on CAS server to /cas/login","level":"info"}
...
test/06-test-xml-parser.js 1> server up: cas_node_tests 3002
 PASS  test/06-test-xml-parser.js 24 OK 500.848ms


  🌈 SUMMARY RESULTS 🌈


Suites:   6 passed, 6 of 6 completed
Asserts:  100 passed, of 100
Time:     31s
----------------------|----------|----------|----------|----------|-------------------|
File                  |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
----------------------|----------|----------|----------|----------|-------------------|
All files             |    70.32 |    51.63 |     61.4 |    71.18 |                   |
 cas_validate.js      |      100 |      100 |      100 |      100 |                   |
 check_or_redirect.js |    57.69 |       25 |       50 |       60 |... 35,36,38,42,46 |
 force_protocol.js    |       95 |    92.31 |      100 |      100 |             45,62 |
 invalidate.js        |    26.67 |        0 |        0 |    26.67 |... 48,49,50,52,61 |
 logger.js            |       65 |    58.33 |      100 |       65 |... 20,27,29,30,36 |
 logout.js            |    75.76 |    41.67 |       80 |    78.13 |... 40,41,42,44,45 |
 redirect.js          |    94.12 |       70 |      100 |    96.97 |                63 |
 sax_parser.js        |    23.73 |    23.33 |       25 |    23.73 |... ,97,99,101,163 |
 session_or_abort.js  |       25 |        0 |        0 |       25 | 14,15,16,18,20,21 |
 ssoff.js             |    90.91 |       50 |      100 |    90.91 |                 9 |
 ticket.js            |    81.48 |       65 |       60 |    83.02 |... 99,100,115,116 |
 ticket_store.js      |       78 |    45.83 |       80 |       78 |... 0,91,94,96,133 |
 xml_parser.js        |     87.5 |    56.67 |    72.73 |     87.5 |... 86,187,188,190 |
----------------------|----------|----------|----------|----------|-------------------|
bash-5.0$
```

(The tests take a while (31 seconds in the above run), because there
are a few `sleep`s in there to allow tickets to time out.)

As you can see, test coverage is not great.  I'm working on that.





# Redis version 2.6

This library now requires redis version 2.6.x.  I recently added
time-to-live capabilities when storing the session ticket data (using
the redis setex command as suggested by @chrisbarran).  The test for
this functionality (test/ttl_test.js) fails when running Redis 2.4,
but passes when running Redis 2.6.

# Version 0.1.9

A minor update to parse attributes in a second way.  According to user
@cricri's pull request, another way that is common to send user
attributes to the CAS client is to simply list them.  That is, the way
I am parsing by default is

```xml
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
	<cas:authenticationSuccess>
		<cas:user>h_mueller</cas:user>
		<cas:attributes>
					<cas:mail>a.b@c.de</cas:mail>
					<cas:__AUTHUSERCONTEXT__>cont</cas:__AUTHUSERCONTEXT__>
					<cas:cn>commonname</cas:cn>
					<cas:__AUTHTYPE__>TUID</cas:__AUTHTYPE__>
					<cas:surname>Müller</cas:surname>
					<cas:tudUserUniqueID>1234567</cas:tudUserUniqueID>
					<cas:givenName>Hans</cas:givenName>
		</cas:attributes>
	</cas:authenticationSuccess>
</cas:serviceResponse>
```

But there is an alternate way that simply lists the attributes as so:

```xml
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
  <cas:authenticationSuccess>
    <cas:user>bob</cas:user>
    <cas:attribute name="uid" value="b01234" />
    <cas:attribute name="mail" value="bob@mail.com" />
    <cas:attribute name="cn" value="smith" />
    <cas:attribute name="givenname" value="bob" />
    <cas:attribute name="service" value="other" />
    <cas:attribute name="permission" value="p1" />
    <cas:attribute name="permission" value="p2" />
    <cas:attribute name="permission" value="p3" />
    <cas:attribute name="uidnumber" value="123456789" />
  </cas:authenticationSuccess>
</cas:serviceResponse>
```

Version 0.1.9 should now properly parse the second way as well,
whereas before it would simply choke and die.

Check out the test in test/xml_parser_test.js, look for the test with
"cas_auth_2.xml" (about line 122 is where that test begins).

This email thread is one that I found when trying to dig up the
"standard" way to send user attributes:
http://jasig.275507.n4.nabble.com/CAS-attributes-and-how-they-appear-in-the-CAS-response-td264272.html


# Version 0.1.8

Biggest change here is a switch from SAX parser to XML doc parser for
parsing the response from the CAS server ticket validation.  It was
reported that the parser was choking on attributes with umlauts and
other common utf-8 characters.  Apparently, either the SAX parser
approach in libxmljs or the way I was using it was to blame, but the
upshot was that non-ascii characters were getting mangled.

To fix this, I switched to using the whole-doc parsing approach.  This
will use slightly more memory, etc, as the whole DOM tree for the
response has to be loaded into memory, but the docs are small so that
is probably fine.

The test that checks this is in `test/xml_parser_test.js`  It does not
use a live CAS server, so you can run it on your own and load it up
with your own CAS response docs to see whether everything is getting
parsed okay.  Just replace the file in `test/files/cas_auth.xml` with
your own difficult-to-parse case, and then submit a bug report is
stuff is breaking.

# Version 0.1.0

This new version brings with it some small API changes for the few
people who might be using this.  The major difference is that it is
no longer optional to pass the service location.  That is, the
routines do not try to guess what the service might be from the
request header.  This is because at the Open Apereo 2013 conference,
it was pointed out during a security audit that doing so is a possible
security flaw.

So invoke the various functions as so:

```javascript
app.use('/valid'
       ,cas_validate.ticket({'cas_host':my_cas_host,
                             'service':'http://'+testhost +':'+testport+'/valid'}))
```

The other major change in functionality is that the ticket response
from the CAS server is now parsed for attributes.  Unfortunately, this
currently requires an XML response from the CAS server.  I will
implement the JSON response handler soon, but in the interim you might
want to check out the
[Sheffield University fork](https://github.com/SheffieldUni/cas_validate)

# Roadmap

I am in the midst of refactoring and modularizing this library.  The
most pressing need is to parse a  JSON response  from the CAS server.
Next comes centralizing the initialization of this library.  For the
moment, the best approach is to create an object in your calling code
that holds the common CAS initialization attributes.

Version 0.2.0 will be hit when JSON responses are possible, and
version 0.3.0 will be hit when all of the various routines are
modularized (so you don't have to delete the SSOFF code, for example,
you just don't have to use it)


# Example use for a Connect-based server:

Using the library is pretty easy.  Just add the necessary `require`
statement, and then slot in the desired CAS behavior.  For example to
prevent all access to your application, you would do the following:

```javascript

var cas_validate = require('cas_validate');
...

var app = connect()
            .use(connect.cookieParser('barley wheat napoleon'))
            .use(connect.session({ store: new RedisStore }))
            .use(cas_validate.redirect({'cas_host':'my.cas.host.net'})
            .use(function(req, res, next){
                      res.end('hello world')
                 });
var server = app.listen(3000,function(e){
            if(e) throw new Error(e)
            console.log('app started on port 3000')
    });
);
```

A few things to note.  First I am using the connect-redis plugin to
manage sessions from CAS.  I haven't tested whether other session
management plugins will work, but as long as they allow simple
operations such as

    req.session.st = ticket

they should work fine.

Second, the `cas_host` option currently just wants the host.  I prepend
`https://` to this host.  If you aren't using https for your CAS
server, then you're out of luck for using this library.


# Installation

## Via npm

```bash
$ cd myapplication
$ npm install cas_validate
```

Or you can add it to your package.json dependencies.


## Manual install

```bash
$ cd ~/my/github/repos
$ git clone git://github.com/jmarca/cas_validate.git
$ cd myapplication
$ npm install ~/my/github/repos/cas_validate
```



# Exported Functions

## `ticket`

The `ticket` function is crucial to handling CAS sessions.  It will
consume the service ticket from the CAS server, verify that it is
valid, establish a valid session on your service for the client, and
will store the CAS credentials in a redis database to allow for single
sign out POST messages.  If there is no service ticket in the request,
or if the service ticket is not valid, this function will simply pass
control along to the next connect middleware in the web stack.

### Options

* `cas_host`: the CAS hostname, without the 'https://' part and
  without the '/cas/login' part.  Something like `cas.example.net`.
  The default is to read the CAS_HOST environment variable.  This
  option, if set, will override the default.

* `service`: the service for which the service ticket was issued.  If
  used in the same route as the `check_...` part of the function, then
  this parameter can be left to its default, and the correct value
  will be deduced from the request parameters.  In some cases it might
  be necessary to specify this value.

## `check_or_redirect`

The `check_or_redirect` function is probably the most useful one.
Used in conjunction with the `ticket` function, it will enable
CAS-based authentication.

### Options

* `cas_host`: the CAS hostname, without the 'https://' part and
  without the '/cas/login' part.  Something like `cas.example.net`.
  The default is to read the CAS_HOST environment variable.  This
  option, if set, will override the default.

* `service`: the service for which the service ticket will be issued,
  and to which the CAS server will redirect the request after the user
  has logged in.  The default is to figure out the service from the
  incoming request, but one may want to redirect the incoming request
  somewhere else.

### Example

An example of redirecting the request to another destination is shown
below, modified from the test suite.


```javascript

app = connect()
app.use(cas_validate.ssoff())
app.use(cas_validate.ticket({'cas_host':chost}))
app.use(function(req, res, next){
            if(req.session.st){
                return res.end('hello '+req.session.name)
            }else{
                return res.end('hello world (not logged in)')
            }
        }
       )
var login = connect()
login.use(connect.cookieParser('six foot barley at Waterloo'))
login.use(connect.session({ store: new RedisStore }))
login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
                                                  ,'service':'http://'+testhost+':'+testport+'/'}))
login.use('/',app)

server = login.listen(testport,done)

```

In the above example, the `/login` route will send the user to the CAS
server to login, and then return them to the `/` destination.  The
default behavior would be to return them to the `/login` path that
they came from.

Also note that since we don't expect the CAS server to send its ticket
to the `/login` path, the `ticket` service is not attached to that
route.  It is attached to the `/` route, and will consume the ticket
there.

Also also, when the CAS session expires and the CAS server sends a
post request informing your server of this fact, it will send it to
the path listed in the `service` parameter.  So if you only want to
allow POST requests to a certain address, that is another reason to
specify the service parameter.

## `check_and_return`

The `check_and_return` function is somewhat useful.  The idea is to
exploit the feature in the CAS server that listens for a
'gateway=true' parameter in the URL.  This will return a service
ticket if the client has a valid CAS session, and will return nothing
if not.

### Options

The same options as `check_or_redirect`, above

### Example

The previous example has been modified below to use check_and_return
instead of check_or_redirect

```javascript

app = connect()
app.use(cas_validate.ssoff())
app.use(cas_validate.ticket({'cas_host':chost}))
app.use(cas_validate.check_and_return({'cas_host':chost
                                      ,'service':'http://'+testhost+':'+testport+'/'}))
app.use(function(req, res, next){
            if(req.session.st){
                return res.end('hello '+req.session.name)
            }else{
                return res.end('hello world (not logged in)')
            }
        }
       )
var login = connect()
login.use(connect.cookieParser('six foot barley at Waterloo'))
login.use(connect.session({ store: new RedisStore }))
login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
                                                  ,'service':'http://'+testhost+':'+testport+'/'}))
login.use('/',app)

server = login.listen(testport,done)


```

In the previous server, the system would not know whether or not a
user was logged in until the user went to the `/login` route and
triggered the `check_or_redirect` function.  Here, instead, the `/`
route has the `check_and_return` function set.  What happens is that
the first time the user goes to the `/` location, the CAS system is
checked to see if the user is logged in already.  Internally this sets
a flag in the session, so as to prevent an infinite loop.  If the user
is logged in already, then the CAS system will respond with a valid
service ticket that the `ticket` service will consume.  If the client
has not established a CAS login, then there is no ticket sent from
CAS, and the user is not logged in.

The problem with this approach is that it does not detect if the user
goes to your web application, then logs in to another CAS service.
Once the gateway service is checked, it is not checked again.

If you wish to check the CAS service once with every request, then
simply delete the session property `req.session.gateway`.  However, be
aware that until the user logs in properly, resetting
`req.session.gateway` will cause a redirect through the CAS server
with every request, which will greatly slow down the performance of
your system.


## `redirect`

`redirect` is a somewhat lame filter, but it can be useful.  All it
does is redirect incoming queries to the CAS login page.  Even if the
session has been established, it will always ignore that fact and
bounce the request.

## `ssoff`

The `ssoff` service will listen for incoming POST messages from the
CAS server and will delete sessions as appropriate.

Do *not* put this service after the `check_or_redirect` service, or the
CAS server POSTs will get redirected to the CAS server to log in!

### Options

No options

### Example

```javascript

app.use(cas_validate.ssoff())
app.use(cas_validate.ticket())
app.use(cas_validate.check_or_redirect())
app.use('/',function(req, res, next){
          res.end('hello only to the authenticated world')
});

```

## `logout`

The `logout` service is similar to single sign off, but does the job
of invalidating the current session first, before triggering the CAS
server's logout function.

You can use this with the `ssoff` service to enable logging out from
your application directly, or indirectly from some other CAS enabled
app.

### Options

* `cas_host`: the CAS hostname, without the 'https://' part and
  without the '/cas/logout' part.  Something like `cas.example.net`.
  The default is to read the CAS_HOST environment variable.  This
  option, if set, will override the default.

* `service`: the service for which the service ticket will be issued,
  and to which the CAS server will redirect the request after the user
  has logged in.  The default is to figure out the service from the
  incoming request, but one may want to redirect the incoming request
  somewhere else.

* `logout_service`: the default CAS logout service is `/cas/logout`.
  If your CAS setup uses a different endpoint, then specify that here.


### Example

As usual, check out the test for a complete example.  Cut and paste below:

```javascript

app = connect()
    .use(connect.bodyParser())
      .use(connect.cookieParser('barley Waterloo Napoleon loser'))
      .use(connect.session({ store: new RedisStore }))

app.use('/username',cas_validate.username)

app.use('/quit',cas_validate.logout({'cas_host':'my.cas.host'
                                    ,'service':'http://myhost.com'}))
app.use(cas_validate.ssoff())
app.use(cas_validate.ticket({'cas_host':'my.cas.host'
                             ,'service':'http://myhost.com'}))
app.use(cas_validate.check_and_return({'cas_host':'my.cas.host'
                                      ,'service':'http://myhost.com'}))

app.use(function(req, res, next){
            if(req.session.st){
                return res.end('hello '+req.session.name)
            }else{
                return res.end('hello world (not logged in)')
            }
        }
       )
var login = connect()
.use(connect.cookieParser('six foot barley at Waterloo'))
.use(connect.session({ store: new RedisStore }))
login.use('/login',cas_validate.check_or_redirect({'cas_host':'my.cas.host'
                                                  ,'service':'http://myhost.com'}))
login.use('/',app)
server=login.listen(testport
                   ,done)

```


## `username`

A simple service to spit back the current logged in user's username as
a JSON object, or null.

Either:

```javascript

return res.end(JSON.stringify({'user':req.session.name}));

```

or

```javascript

return res.end(JSON.stringify({'user':null}));

```

### Options

No options


## `session_or_abort`

The `session_or_abort` service no longer works with Connect, as
routing has been removed.  This is the only feature that requires
Express.

The idea is to abort the current route if a session has not been
established.  This is done by calling `next('route')` within the code
if the CAS session check fails.

The intended use case is to assign certain stacks of routes to logged
in users, and others to those who are not logged in, without having to
resort to multiple paths or lots of `if` statements in your server
code.

### Options

No options

### Example

```javascript

app = express()
      .use(connect.cookieParser('barley Waterloo Napoleon Mareschal Foch bravest'))
      .use(connect.session({ store: new RedisStore }))

app.get('/secrets'
       ,cas_validate.session_or_abort()
       ,function(req,res,next){
            res.end('super secret secrets')
        })

app.get('/secrets'
       ,function(req,res,next){
            res.end('public secrets')
        })

```


# Tests

The tests provide working examples of how to use the library.

To run the tests, you need to have a working CAS server, and you need
to set lots of environment variables.

## Environment variables

* CAS_HOST:  no default.  The CAS host (bare host name or number; not
  https, not /cas/login)

* CAS_USER:  no default.  Your CAS username you want to use for the
  tests.

* CAS_PASS: no default.  The password to go along with the CAS
  username

* CAS_VALIDATE_TEST_URL: Default is '127.0.0.1'.  If you want to test
  single sign out (the `ssoff` service), then you'll need to run your
  test server on a public machine, with a URL that the CAS server can
  send a POST to.  SSOFF tests will be skipped if CAS_VALIDATE_TEST_URL
  is 127.0.0.1 and the hostname part of CAS_HOST is *not* 127.0.0.1.

* CAS_VALIDATE_TEST_PORT: Default is 3000.  If you are already using
  port 3000 for something else, change this.  Also, make sure that
  this port is not blocked in your firewall if you want to test single
  sign off...otherwise you won't see the POSTs from the CAS server to
  your test application.

To run the tests, make sure to first install all of the dependencies
with

    npm install

Then run the tests with

    npm test

or

    make test

(I do this to get the nyan cat reporter)

If you are running on localhost, the last tests related to single sign
off will be skipped.  The idea is that localhost isn't usually an
address that can be hit by another machine, so the test should not be
run.

Instead, put the library on a machine with a URL (even a numeric one)
that your CAS server can see and send a POST to.  This will more
accurately model a real production environment.

For example, if you have a server called `http://awesome.mycompany.net`
you can run the test on port 3000 on this machine by typing

```
export CAS_VALIDATE_TEST_URL='awesome.mycompany.net'
```

Then all the tests will run, and they should all pass.  Assuming of
course that you have a properly configured CAS server and identified
it as noted above.  The only caveat is that waiting for the POST is
slow, and so the test may timeout.  If this happens, try running with
a longer timeout period (`mocha --timeout 50000 test`)


## Testing XML validation functionality

By default now, if your CAS server returns user attributes as XML,
then these attributes will be parsed and loaded into the environment.

As noted above, the XML parser was switched away from a SAX-style
parser to a whole document parser, in order to get around a character
encoding bug.  This change has an accompanying test in
`test/xml_parser_test.js`, and reads in the two files found in
`test/files/`, so if you want to test out your own specific case prior
to deploying this library, swap in your own XML files there.

The test (`test/parse_casxml_response.js`) is designed explicitly for my case,
where I am passing back `['mail','sn','cn','givenName','groups']` from
ldap via CAS.  If your local CAS server is not passing back these
things, then the test will fail for you.  To help, I am dumping to the
console the object returned from parsing.  If it makes sense to you
given your CAS server and given your test user (CAS_USER environment
variable), then the test is passing.  Feel free to fork and create a
more general test if you can think of one.



# Logging

This package uses [winston](https://github.com/flatiron/winston).  Not
well, but anyway, there it is.  Basically, if you want lots of output,
set the `NODE_ENV` environment variable to 'development'.  If you are
running in production, set `NODE_ENV` to 'production'.  This also
meshes well with Express usage of the `NODE_ENV` variable.  Finally,
if something weird is going on in production, you can also set the log
level explicitly, by setting either `CAS_VALIDATE_LOG_LEVEL` or
`LOGLEVEL` to the usual ['debug','info','warn','error'] (although this
hasn't been tested)

In the code noisy alerts are at the debug level, and then errors are
at the error level, but maybe in the future I'll add finer grained
message levels.




# See Also

The CAS server is documented at <http://www.jasig.org/cas>.
