var should = require('should')
var parseUrl = require('url').parse;
var http = require('http');
var request = require('request');
var querystring = require('querystring');
var redis = require("redis");
var redclient = redis.createClient();

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
        //console.log(b)
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
                                       console.log(opts)
                                       console.log(b)
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


describe('cas_validate ttl in redis',function(){

    process.env.CAS_SESSION_TTL=2
    var cas_validate = require('../lib/cas_validate')



    var app,server;
    before(

        function(done){
            app = connect()
                  .use(connect.bodyParser())
                  .use(connect.cookieParser('barley Waterloo Napoleon loser'))
                  .use(connect.session({store: new RedisStore({ttl: 2 * process.env.CAS_SESSION_TTL})
                                       ,secret:'barley Waterloo Napoleon loser'
                                        //,cookie:{maxAge:2 * 1000 * process.env.CAS_SESSION_TTL}
                                        // don't need to set cookie max age
                                       })
                      )

            app.use('/username',function(req,res,next){
                cas_validate.get_username(req,function(err,obj){

                    res.setHeader('Content-Type','application/json');
                    res.end(JSON.stringify(obj))
                    return null
                })
            })
            app.use('/quit',cas_validate.logout({'service':'http://'+testhost+':'+testport}))
            app.use(cas_validate.ssoff())
            app.use(cas_validate.ticket({'cas_host':chost
                                         ,'service':'http://'+testhost+':'+testport}))
            app.use(cas_validate.check_and_return({'cas_host':chost
                                                 ,'service':'http://'+testhost+':'+testport}))
            app.use(function(req, res, next){
                        if(req.session.st){
                            return res.end('hello '+req.session.name)
                        }else{
                            return res.end('hello world (not logged in)')
                        }
                    }
                   )
            var login = connect()
                  .use(connect.cookieParser('6ft barley at Waterloo'))
                  .use(connect.session({store: new RedisStore({ttl: 2 * process.env.CAS_SESSION_TTL})
                                       ,secret:'6ft barley at Waterloo'
                                        //,cookie:{maxAge:2 * 1000 * process.env.CAS_SESSION_TTL}
                                        // don't need to set cookie max age
                                       })
                      )
            login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
                                                              ,'service':'http://'+testhost+':'+testport+'/'}))
            login.use('/',app)
            server=login.listen(testport,done)
            return null
        })
    after(function(done){
        return server.close(done)
    })

    it('should not sprout keys in redis',function(done){
        var keys

        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){
                             // baseline keys
                             redclient.keys('ST*',function(e,r){
                                 keys=r
                                 return cb(null,rq)
                             })
                             return null
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
                                   b.should.equal('hello '+cuser);
                                    // session established, now we can get username
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             redclient.keys('ST*',function(e,r){
                                 var diff = _.difference(r,keys)
                                 diff.should.have.property('length',1)
                                 return cb(null,rq)
                             })
                             return null
                         }
                        ,function(rq,cb){
                             rq({url:'http://'+ testhost +':'+testport+'/username'}
                               ,function(e,r,b){
                                    var u = JSON.parse(b)
                                    u.should.have.property('user_name',cuser)
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             redclient.keys('ST*',function(e,r){
                                 var diff = _.difference(r,keys)
                                 diff.should.have.property('length',1)
                                 return cb(null,rq)
                             })
                             return null
                         }
                        ,function(rq,cb){
                             // now log out
                             rq({url:'http://'+ testhost +':'+testport+'/quit'
                                ,followRedirect:true}
                               ,function(e,r,b){
                                    r.statusCode.should.equal(200)
                                    should.exist(b)
                                    b.should.equal('hello world (not logged in)')
                                    cb(e, rq)
                                })
                         }
                        ,function(rq,cb){
                             redclient.keys('ST*',function(e,r){
                                 var diff = _.difference(r,keys)
                                 diff.should.eql([])
                                 cb(null,rq)
                             })
                             return null
                         }]
                       ,done
                       )
        return null;
    })

    it('should time out redis keys',function(done){
        var keys

        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){
                             // baseline keys
                             redclient.keys('ST*',function(e,r){
                                 keys=r
                                 return cb(null,rq)
                             })
                             return null
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
                                   b.should.equal('hello '+cuser);
                                    // session established, now we can get username
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             redclient.keys('ST*',function(e,r){
                                 var diff = _.difference(r,keys)
                                 diff.should.have.property('length',1)
                                 return cb(null,rq)
                             })
                             return null
                         }
                        ,function(rq,cb){
                             // pause for ttl seconds, then check again
                             setTimeout(function(){
                                 redclient.keys('ST*',function(e,r){
                                     var diff = _.difference(r,keys)
                                     diff.should.eql([])
                                     return cb(null,rq)
                                 })
                                 return null
                             },process.env.CAS_SESSION_TTL*1000)
                             return null
                         }
                        ,function(rq,cb){
                             // but unfortunately the session is still valid
                             rq({url:'http://'+ testhost +':'+testport+'/username',followRedirect:false}
                               ,function(e,r,b){
                                    var u = JSON.parse(b)
                                    u.should.have.property('user_name',cuser)
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             // and logging out of CAS will NO LONGER
                             // CAUSE Single Sign Out!!!
                             //
                             // log out of CAS directly
                             cas_logout_function(rq
                                                ,cb)
                         }
                        ,function(rq,cb){
                             // but unfortunately the session is still valid
                             rq({url:'http://'+ testhost +':'+testport+'/username',followRedirect:false}
                               ,function(e,r,b){
                                    var u = JSON.parse(b)
                                    u.should.have.property('user_name',cuser)
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             // but pause for > ttl * 2 (what I've set the connect session length to be), and all is well
                             setTimeout(function(){
                                 rq({url:'http://'+ testhost +':'+testport+'/username'}
                                   ,function(e,r,b){
                                        var u = JSON.parse(b)
                                        u.should.eql({})
                                        cb(e)
                                    })
                                 return null
                             },process.env.CAS_SESSION_TTL*3*1000)
                             return null
                         }
                        ]
                       ,done
                       )
        return null;
    })

})

describe('cas_validate ttl in redis with same ttl for server',function(){

    process.env.CAS_SESSION_TTL=2
    var cas_validate = require('../lib/cas_validate')


    var app,server;
    before(

        function(done){
            app = connect()
                  .use(connect.bodyParser())
                  .use(connect.cookieParser('barley Waterloo Napoleon loser'))
                  .use(connect.session({store: new RedisStore({ttl: process.env.CAS_SESSION_TTL})
                                       ,secret:'barley Waterloo Napoleon loser'
                                        //,cookie:{maxAge:2 * 1000 * process.env.CAS_SESSION_TTL}
                                        // don't need to set cookie max age
                                       })
                      )

            app.use('/username',function(req,res,next){
                cas_validate.get_username(req,function(err,obj){

                    res.setHeader('Content-Type','application/json');
                    res.end(JSON.stringify(obj))
                    return null
                })
            })
            app.use('/quit',cas_validate.logout({'service':'http://'+testhost+':'+testport}))
            app.use(cas_validate.ssoff())
            app.use(cas_validate.ticket({'cas_host':chost
                                         ,'service':'http://'+testhost+':'+testport}))
            app.use(cas_validate.check_and_return({'cas_host':chost
                                                 ,'service':'http://'+testhost+':'+testport}))
            app.use(function(req, res, next){
                        if(req.session.st){
                            return res.end('hello '+req.session.name)
                        }else{
                            return res.end('hello world (not logged in)')
                        }
                    }
                   )
            var login = connect()
                  .use(connect.cookieParser('6ft barley at Waterloo'))
                  .use(connect.session({store: new RedisStore({ttl: process.env.CAS_SESSION_TTL})
                                       ,secret:'6ft barley at Waterloo'
                                        //,cookie:{maxAge:2 * 1000 * process.env.CAS_SESSION_TTL}
                                        // don't need to set cookie max age
                                       })
                      )
            login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
                                                              ,'service':'http://'+testhost+':'+testport+'/'}))
            login.use('/',app)
            server=login.listen(testport,done)
            return null
        })
    after(function(done){
        return server.close(done)
    })

    it('should time out redis keys',function(done){
        var keys

        async.waterfall([function(cb){
                             _setup_request(cb)
                         }
                        ,function(rq,cb){
                             // baseline keys
                             redclient.keys('ST*',function(e,r){
                                 keys=r
                                 return cb(null,rq)
                             })
                             return null
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
                                   b.should.equal('hello '+cuser);
                                    // session established, now we can get username
                                    cb(e,rq)
                                })
                         }
                        ,function(rq,cb){
                             redclient.keys('ST*',function(e,r){
                                 var diff = _.difference(r,keys)
                                 diff.should.have.property('length',1)
                                 return cb(null,rq)
                             })
                             return null
                         }
                        ,function(rq,cb){
                             // pause for ttl seconds, then check again
                             setTimeout(function(){
                                 redclient.keys('ST*',function(e,r){
                                     var diff = _.difference(r,keys)
                                     diff.should.eql([])
                                     return cb(null,rq)
                                 })
                                 return null
                             },process.env.CAS_SESSION_TTL*1000)
                             return null
                         }
                        ,function(rq,cb){
                             // this time, the server session has also
                             // timed out and is no longer valid
                             rq({url:'http://'+ testhost +':'+testport+'/username',followRedirect:false}
                               ,function(e,r,b){
                                    var u = JSON.parse(b)
                                    u.should.eql({})
                                    cb(e,rq)
                                })
                         }
                        ]
                       ,done
                       )
        return null;
    })

})
