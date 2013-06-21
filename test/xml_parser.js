var should = require('should')
var parseUrl = require('url').parse;
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var redis = require("redis");

var env = process.env;
var chost = env.CAS_HOST;
var cuser = env.CAS_USER;
var cpass = env.CAS_PASS;
var casservice = 'https://'+chost+'/'
var casurl = casservice + 'cas/login'

var testhost = env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
var testport = env.CAS_VALIDATE_TEST_PORT || 3000

var _ = require('underscore');



var async = require('async')

var express = require('express')

var connect = require('connect')
var RedisStore = require('connect-redis')(connect);

process.env.CAS_SESSION_TTL=2
var cas_validate = require('../lib/cas_validate')

var jar;
function _setup_request(cb){
// make sure CAS can talk to request and not die a horrible death of a confused tomcat
    // clear the cookies for the next test
    jar = request.jar()
    var rq = request.defaults( {jar:jar
//                                ,headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:12.0) Gecko/20100101 Firefox/12.0'}

                               })
    cb(null,rq)
}


// need to set up a server running bits and pieces of sas validate to test this properly.
// because the tests are responding to incoming connections.

function _login_handler(rq,callback){
    return function(e,r,b){
        // parse the body for the form url, with the correct jsessionid
        var form_regex = /id="fm1".*action="(.*)" method="post"/;
        var result = form_regex.exec(b)
        var opts={}
        opts.url=casservice+result[1]
        opts.form={'username':cuser
                  ,'password':cpass
                  ,'submit':'LOGIN'
                  }
        opts.followRedirect=true
        // scrape hidden input values
        var name_regex = /name="(.*?)"/
            var value_regex = /value="(.*?)"/
            var hidden_regex = /<input.*type="hidden".*?>/g
        while ((result = hidden_regex.exec(b)) !== null)
        {
            var n = name_regex.exec(result[0])
            var v = value_regex.exec(result[0])
            opts.form[n[1]]=v[1]
        }
        // console.log('opts is' )
        // console.log(opts)
        // console.log('--' )
        rq.post(opts,callback)
    }
}

function cas_login_function(rq,callback){
             var opts ={url:casurl}

             rq(opts
               ,_login_handler(rq
                              ,function(e,r,b){
                                   var success_regex = /Log In Successful/i;
                                   if(success_regex.test(b)){
                                       return callback()
                                   }else{
                                       return callback('CAS login failed')
                                   }
                               }) )
         }

function cas_logout_function(rq,callback){
    var logouturl = 'https://'+chost + '/cas/logout';
    rq(logouturl
       ,function(e,r,b){
           // give the server a chance to fire off its post
           setTimeout(function(){
               callback(e,rq)
           },100)
       })
}

describe('cas_validate get user attributes via XML',function(){

    var app,server;

    before(
        function(done){
            app = connect()
                  .use(connect.cookieParser('barley Waterloo Napoleon Mareschal Foch'))
                  .use(connect.session({ store: new RedisStore }))

            app.use('/attributes'
                   ,cas_validate.ticket({'cas_host':chost
                                        ,'service':'http://'+testhost +':'+testport+'/attributes'}))
            app.use('/attributes'
                   ,cas_validate.check_and_return({'cas_host':chost
                                                  ,'service':'http://'+testhost +':'+testport+'/attributes'}))
            app.use('/attributes'
                   ,function(req,res,next){
                        cas_validate.get_attributes(req,function(err,obj){
                            if(err){
                                res.end(JSON.stringify({}))
                                return null
                            }
                            res.setHeader('Content-Type','application/json');
                            res.end(JSON.stringify(obj))
                            return null
                        })
                        return null
                    })

            app.use(cas_validate.ticket({'cas_host':chost
                                        ,'service':'http://'+testhost +':'+testport+'/'}))
            app.use(cas_validate.check_or_redirect({'cas_host':chost
                                        ,'service':'http://'+testhost +':'+testport+'/'}))

            app.use('/',function(req, res, next){
                      res.end('hello world')
                  });

            server = app.listen(testport
                                                  ,done)
        })
    after(function(done){
        server.close(done)
    })


    it('should reply with an empty json object when no session is established',function(done){
        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){

                             rq({url:'http://'+ testhost +':'+testport+'/attributes'
                                ,followRedirect:true}
                               ,function(e,r,b){
                                    r.statusCode.should.equal(200)
                                    should.exist(b)
                                    console.log(b)
                                    JSON.parse(b).should.eql({})
                                    cb()
                                }
                               )
                         }]
                       ,done
                       )


    })

    it('should return the current user name when there is a session',function(done){

        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){

                             // set up a session with CAS server
                             cas_login_function(rq
                                               ,function(e){
                                                    return cb(e,rq)
                                                })
                         }
                        ,function(rq,cb){
                             rq('http://'+ testhost +':'+testport+'/'
                               ,function(e,r,b){

                                    b.should.equal('hello world');
                                    // session established, now we can get attributes
                                    rq({url:'http://'+ testhost +':'+testport+'/attributes'}
                                      ,function(e,r,b){
                                           r.statusCode.should.equal(200)

                                           should.exist(b)
                                           var u = JSON.parse(b)
                                           // remove groups, as the test user may not have it
                                           //
                                           // actually most of these are dependent upon our
                                           // particular ldap setup
                                           _.each(['mail','sn','cn','givenName','user_name'],
                                                  function(param){
                                                      u.should.have.property(param)
                                                  });
                                           cb()
                                       }
                                      )
                                })

                         }]
                       ,done
                       )

    })

    it('should not build an infinite username on repeated gateway calls',function(done){

        var username
        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){

                             // set up a session with CAS server
                             cas_login_function(rq
                                               ,function(e){
                                                    return cb(e,rq)
                                                })
                         }
                        ,function(rq,cb){
                             rq('http://'+ testhost +':'+testport+'/'
                               ,function(e,r,b){

                                    b.should.equal('hello world');
                                    // session established, now we can get attributes
                                    rq({url:'http://'+ testhost +':'+testport+'/attributes'}
                                      ,function(e,r,b){
                                           r.statusCode.should.equal(200)
                                           should.exist(b)
                                           var u = JSON.parse(b)
                                           console.log(u)
                                           username = u.user_name
                                           cb(null,rq)
                                       }
                                      )
                                })

                         }
                        ,function(rq,cb){
                             rq('http://'+ testhost +':'+testport+'/'
                               ,function(e,r,b){
                                    b.should.equal('hello world');
                                    // session established, now we can get attributes
                                    rq({url:'http://'+ testhost +':'+testport+'/attributes'}
                                      ,function(e,r,b){
                                           r.statusCode.should.equal(200)
                                           should.exist(b)
                                           var u = JSON.parse(b)
                                           console.log(u)
                                           u.user_name.should.eql(username)
                                           cb(null)
                                       }
                                      )
                                })

                         }]
                       ,done
                       )

    })

})
