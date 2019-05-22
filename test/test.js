const tap = require('tap')

const parseUrl = require('url').parse;
const http = require('http');

const sa = require('superagent')

const redis = require("redis")
const redclient = redis.createClient();

const env = process.env;
const chost = env.CAS_HOST;
const cuser = env.CAS_USER;
const cpass = env.CAS_PASS;
const casservice = 'https://'+chost+'/'
const casurl = casservice + 'cas/login'

const testhost = env.CAS_VALIDATE_TEST_URL || 'cas'
const testport = env.CAS_VALIDATE_TEST_PORT || 8443

const express = require('express')

const connect = require('connect')
const RedisStore = require('connect-redis')(connect)

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')

var jar
const agent = sa.agent();
// async function _setup_request(){
//     // make sure CAS can talk to request and not die a horrible death of a confused tomcat
//     // clear the cookies for the next test
//     jar = request.jar()
//     const rq = request.defaults( {jar:jar
// //                                ,headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:12.0) Gecko/20100101 Firefox/12.0'}
//                                  })
//     return rq
// }


// need to set up a server running bits and pieces of cas validate to test this properly.
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



tap.test('cas_validate.redirect',function(t){
    var app,server

    app = connect()
        .use(connect.cookieParser('barley wheat napoleon'))
        .use(connect.session({ store: new RedisStore }))
        .use(cas_validate.redirect({'cas_host':chost
                                    ,'service':'http://'+ testhost +':'+testport+'/index.html'})
                      )
        .use(function(req, res, next){
            t.fail('should not ever request')
        })
    server = app.listen(testport, () =>{

        server.close(function () {
            done(err)
        })
    })

    t.test('should redirect when no session is established', tt => {

        return agent
            .get('http://'+ testhost +':'+testport+'/')
            .ok(res => res.status < 400)
            .redirects(0)
            .then( res => {
                tt.is(res.status,307)
                tt.is(res.headers.location,casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2Findex.html')
                return tt.end()
            })
    })
})

//     it('should also redirect when session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     if(e) console.log(e)
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'
//                                 ,followRedirect:false}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(307)
//                                     r.headers.location.should.equal(casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2Findex.html')
//                                     should.not.exist(b)
//                                     cb()
//                                 }
//                                )

//                          }]
//                        ,done
//                        )
//     })

// })



// describe('cas_validate.check_and_return',function(){

//     var app
//     var server
//     before(
//         function(done){
//             app = connect()
//                   .use(connect.cookieParser('barley Waterloo Napoleon'))
//                   .use(connect.session({ store: new RedisStore }))
//             app.use('/valid'
//                    ,cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/valid'}))
//             app.use('/valid'
//                    ,function(req, res, next){
//                         if(req.session && req.session.st){
//                             return res.end('cas single sign on established in /valid path')
//                         }else{
//                             return res.end('hello world from /valid path, no session')
//                         }

//                     });
//             app.use(cas_validate.check_and_return({'cas_host':chost
//                                                   ,'service':'http://'+ testhost +':'+testport+'/valid'}))
//             app.use('/'
//                    ,function(req, res, next){
//                       // should never get here
//                       if(req.session && req.session.st){
//                           return res.end('error choke and die');
//                       }else{
//                           return res.end('hello world choke and die')
//                       }
//                     });
//             server=app.listen(testport,done)

//         })

//     after(function(done){
//         server.close(done)
//     })

//     it('should return without asking for login when no session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/'
//                                 ,followRedirect:true}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('hello world from /valid path, no session')
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )

//     })

//     it('should not redirect when a session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('cas single sign on established in /valid path')
//                                     cb()
//                                 }
//                                )

//                          }]
//                        ,done
//                        )


//     })

// })

// describe('cas_validate.check_or_redirect and cas_validate.ticket',function(){
//     var app,server;

//     before(
//         function(done){
//             app = connect()
//                   .use(connect.cookieParser('barley Waterloo Napoleon'))
//                   .use(connect.session({ store: new RedisStore }))
//                   .use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//                   .use(cas_validate.check_or_redirect({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'})
//                       )
//                   .use(function(req, res, next){
//                       res.end('hello world')
//                   });
//             server =app.listen(testport
//                                                   ,done)
//         })
//     after(function(done){
//         server.close(done)
//     })

//     it('should redirect when no session is established',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/'
//                                 ,followRedirect:false}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(307)
//                                     r.headers.location.should.equal(casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2F')
//                                     should.not.exist(b)
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )


//     })

//     it('should not be a baby when somebody spoofs a bad ticket',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/?ticket=diediedie'}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.match(/Central Authentication Service/)
//                                     cb()
//                                 }
//                                )

//                          }]
//                        ,done
//                        )

//     })

//     it('should not redirect when a session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('hello world')
//                                     cb()
//                                 }
//                                )

//                          }]
//                        ,done
//                        )

//     })

// })


// describe('cas_validate.redirect and cas_validate.ticket take two',function(){
//     var app,server

//     before(
//         function(done){
//             app = connect()
//             app.use(cas_validate.ssoff())
//             app.use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//             app.use(cas_validate.check_and_return({'cas_host':chost
//                                                   ,'service':'http://'+testhost+':'+testport+'/'}))
//             app.use(function(req, res, next){
//                         if(req.session.st){
//                             return res.end('hello '+req.session.name)
//                         }else{
//                             return res.end('hello world (not logged in)')
//                         }
//                     }
//                    )
//             var login = connect()
//             .use(connect.cookieParser('six foot barley at Waterloo'))
//             .use(connect.session({ store: new RedisStore }))
//             login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
//                                                               ,'service':'http://'+testhost+':'+testport+'/'}))
//             login.use('/',app)

//             server = login.listen(testport,done)

//     })
//     after(function(done){
//         server.close(done)
//     })


//     it('should redirect when no session is established',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/login'
//                                 ,followRedirect:false}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(307)
//                                     r.headers.location.should.equal(casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2F')
//                                     should.not.exist(b)
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )


//     })

//     it('should redirect when no session is established part deux',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('hello world (not logged in)')
//                                     cb(null, rq)
//                                 }
//                                )
//                          }
//                         ,function(rq,cb){

//                              function all_done_handler(e,r,b){
//                                  r.statusCode.should.equal(200)
//                                  should.exist(b)
//                                  b.should.equal('hello '+cuser)
//                                  cb(e)
//                              }

//                              function redirect_handler(e,r,b){
//                                  r.statusCode.should.equal(302)
//                                  rq.get(r.headers.location
//                                        ,all_done_handler)
//                              }

//                              var form_handler = _login_handler(rq
//                                                               ,redirect_handler)
//                              rq({url:'http://'+ testhost +':'+testport+'/login'
//                                 ,followRedirect:true}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     form_handler(e,r,b)
//                                 }
//                                )
//                          }

//                         ]
//                        ,done
//                        )


//     })

//     it('should not redirect when a session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                  r.statusCode.should.equal(200)
//                                  should.exist(b)
//                                  b.should.equal('hello '+cuser)
//                                  cb(e)
//                                 }
//                                )

//                          }]
//                        ,done
//                        )

//     })

// })

// describe('stacking multiple cas_validate.ticket handlers',function(){
//     var app,server

//     before(
//         function(done){
//             app = connect()
//             app.use(cas_validate.ssoff())
//             app.use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//             app.use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//             app.use(cas_validate.check_and_return({'cas_host':chost
//                                                   ,'service':'http://'+testhost+':'+testport+'/'}))
//             app.use(function(req, res, next){
//                         if(req.session.st){
//                             return res.end('hello '+req.session.name)
//                         }else{
//                             return res.end('hello world (not logged in)')
//                         }
//                     }
//                    )
//             var login = connect()
//             .use(connect.cookieParser('six foot barley at Waterloo'))
//             .use(connect.session({ store: new RedisStore }))
//             login.use('/login',cas_validate.check_or_redirect({'cas_host':chost
//                                                               ,'service':'http://'+testhost+':'+testport+'/'}))
//             login.use('/',app)

//             server = login.listen(testport,done)

//     })
//     after(function(done){
//         server.close(done)
//     })


//     it('should not crash, and should redirect when no session is established',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/login'
//                                 ,followRedirect:false}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(307)
//                                     r.headers.location.should.equal(casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2F')
//                                     should.not.exist(b)
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )


//     })

//     it('should not crash, and should should redirect when no session is established part deux',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('hello world (not logged in)')
//                                     cb(null, rq)
//                                 }
//                                )
//                          }
//                         ,function(rq,cb){

//                              function all_done_handler(e,r,b){
//                                  r.statusCode.should.equal(200)
//                                  should.exist(b)
//                                  b.should.equal('hello '+cuser)
//                                  cb(e)
//                              }

//                              function redirect_handler(e,r,b){
//                                  r.statusCode.should.equal(302)
//                                  rq.get(r.headers.location
//                                        ,all_done_handler)
//                              }

//                              var form_handler = _login_handler(rq
//                                                               ,redirect_handler)
//                              rq({url:'http://'+ testhost +':'+testport+'/login'
//                                 ,followRedirect:true}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     form_handler(e,r,b)
//                                 }
//                                )
//                          }

//                         ]
//                        ,done
//                        )


//     })

//     it('should not crash, and should should not redirect when a session is established',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/'}
//                                ,function(e,r,b){
//                                  r.statusCode.should.equal(200)
//                                  should.exist(b)
//                                  b.should.equal('hello '+cuser)
//                                  cb(e)
//                                 }
//                                )

//                          }]
//                        ,done
//                        )

//     })

// })


// describe('cas_validate.username',function(){

//     var app,server;

//     before(
//         function(done){
//             app = connect()
//                   .use(connect.cookieParser('barley Waterloo Napoleon Mareschal Foch'))
//                   .use(connect.session({ store: new RedisStore }))

//             app.use('/username',function(req,res,next){
//                 cas_validate.get_username(req,function(err,obj){

//                     res.setHeader('Content-Type','application/json');
//                     res.end(JSON.stringify(obj))
//                     return null
//                 })
//             })


//             app.use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//             app.use(cas_validate.check_or_redirect({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))

//             app.use('/',function(req, res, next){
//                       res.end('hello world')
//                   });
//             server = app.listen(testport
//                                                   ,done)
//         })
//     after(function(done){
//         server.close(done)
//     })


//     it('should reply with an empty json object when no session is established',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/username'
//                                 ,followRedirect:true}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     JSON.parse(b).should.not.have.property('user')
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )


//     })

//     it('should return the current user name when there is a session',function(done){

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq('http://'+ testhost +':'+testport+'/'
//                                ,function(e,r,b){

//                                     b.should.equal('hello world');
//                                     // session established, now we can get username
//                                     rq({url:'http://'+ testhost +':'+testport+'/username'}
//                                       ,function(e,r,b){
//                                            r.statusCode.should.equal(200)
//                                            should.exist(b)
//                                            var u = JSON.parse(b)
//                                            u.should.have.property('user_name',cuser)
//                                            cb()
//                                        }
//                                       )
//                                 })

//                          }]
//                        ,done
//                        )

//     })

// })

// // this is an express-only feature, as next('route') was removed from connect
// describe('cas_validate.session_or_abort',function(){

//     var app,server;

//     before(
//         function(done){
//             app = express()
//                   .use(connect.cookieParser('barley Waterloo Napoleon Mareschal Foch bravest'))
//                   .use(connect.session({ store: new RedisStore }))

//             app.get('/secrets'
//                    ,cas_validate.session_or_abort()
//                    ,function(req,res,next){
//                         res.end('super secret secrets')
//                     })

//             app.get('/secrets'
//                    ,function(req,res,next){
//                         res.end('public secrets')
//                     })

//             app.use(cas_validate.ticket({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))
//             app.use(cas_validate.check_or_redirect({'cas_host':chost
//                                         ,'service':'http://'+testhost +':'+testport+'/'}))

//             app.use('/',function(req, res, next){
//                       res.end('hello world')
//                   });
//             server=app.listen(testport
//                                                   ,done)
//         })
//     after(function(done){
//         server.close(done)
//     })

//     it('should skip to the next route if a session is not established',function(done){

//                 async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){

//                              rq({url:'http://'+ testhost +':'+testport+'/secrets'
//                                 ,followRedirect:true}
//                                ,function(e,r,b){
//                                     r.statusCode.should.equal(200)
//                                     should.exist(b)
//                                     b.should.equal('public secrets')
//                                     cb()
//                                 }
//                                )
//                          }]
//                        ,done
//                        )
//     })
//     it('should pass through if a session is established',function(done){
//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){
//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){
//                              rq('http://'+ testhost +':'+testport+'/'
//                                ,function(e,r,b){

//                                     b.should.equal('hello world');
//                                     // session established, now we can get secrets
//                                     rq({url:'http://'+ testhost +':'+testport+'/secrets'}
//                                       ,function(e,r,b){
//                                            r.statusCode.should.equal(200)
//                                            should.exist(b)
//                                            b.should.equal('super secret secrets')
//                                            cb()
//                                        }
//                                       )
//                                 })

//                          }]
//                        ,done
//                        )

//     })
// })

// describe('cas_validate.ssoff',function(){


//     var app,server;

//     before(
//         function(done){
//             app = connect()
//                 .use(connect.bodyParser())
//                   .use(connect.cookieParser('barley Waterloo Napoleon Mareschal Foch'))
//                   .use(connect.session({ store: new RedisStore }))

//             app.use('/username',function(req,res,next){
//                 cas_validate.get_username(req,function(err,obj){

//                     res.setHeader('Content-Type','application/json');
//                     res.end(JSON.stringify(obj))
//                     return null
//                 })
//             })

//             // note that ssoff has to go first, because otherwise the
//             // CAS server itself doesn't have a valid session!
//             app.use(cas_validate.ssoff())
//             app.use(cas_validate.ticket({'cas_host':chost
//                                          ,'service':'http://'+testhost+':'+testport}))
//             app.use(cas_validate.check_or_redirect({'cas_host':chost
//                                          ,'service':'http://'+testhost+':'+testport}))

//             app.use('/',function(req, res, next){
//                       res.end('hello world')
//             });
//             server=app.listen(testport
//                        ,done)
//         })
//     after(function(done){
//         server.close(done)
//     })

//     it('should delete the session when the user signs out of CAS server (single sign off)',function(done){
//         if(testhost === '127.0.0.1'){
//             // this test generally will fail unless CAS can post to this host
//             console.log('\ntest aborted on 127.0.0.1.  Try re-running with the CAS_VALIDATE_TEST_URL set to a url that your CAS server can post to')
//             return done()
//         }

//         async.waterfall([function(cb){
//                              _setup_request(cb)
//                          }
//                         ,function(rq,cb){
//                              // set up a session with CAS server
//                              cas_login_function(rq
//                                                ,function(e){
//                                                     return cb(e,rq)
//                                                 })
//                          }
//                         ,function(rq,cb){

//                             rq('http://'+ testhost +':'+testport+'/'
//                                ,function(e,r,b){
//                                    b.should.equal('hello world');
//                                     // session established, now we can get username
//                                     cb(e,rq)
//                                 })
//                          }
//                         ,function(rq,cb){
//                              rq({url:'http://'+ testhost +':'+testport+'/username'}
//                                ,function(e,r,b){
//                                     var u = JSON.parse(b)
//                                     u.should.have.property('user_name',cuser)
//                                     cb(e,rq)
//                                 })
//                          }
//                         ,function(rq,cb){
//                              // now log out of CAS directly
//                              cas_logout_function(rq
//                                                  ,cb)
//                          }
//                         ,function(rq,cb){
//                              // and finally the real test
//                              rq({url:'http://'+ testhost +':'+testport+'/username'}
//                                ,function(e,r,b){
//                                     var u = JSON.parse(b)
//                                     u.should.eql({})
//                                     cb(e)
//                                 })
//                          }]
//                        ,done
//                        )
//         return null;
//     })

// })
