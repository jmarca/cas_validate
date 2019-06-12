
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
