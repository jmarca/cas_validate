
const tap = require('tap')

const env = process.env;
const chost = env.CAS_HOST || 'cas';
const cport = env.CAS_PORT || '8443';
const cuser = env.CAS_USER;
const cpass = env.CAS_PASS;
const casservice = 'https://'+chost+':'+cport+'/'
const casurl = casservice + 'cas/login'

const testhost = env.CAS_VALIDATE_TEST_URL || 'cas_node_tests'
var testport = env.CAS_VALIDATE_TEST_PORT || 3000
const server_store = {}

const request = require('request');
const agentOptions = {
    host: 'www.example.com'
    , port: '443'
    , path: '/'
    , rejectUnauthorized: false
}

const redishost = env.REDIS_HOST || 'redis'
const redis = require('redis')

const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const connect = require('connect')

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')
const http = require('http')


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

function setup_server(){
    const port = testport++
    const store = new RedisStore({host:redishost,  ttl: 100})
    const app = connect()
          .use(session({ 'store': store,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use('/attributes'
               ,cas_validate.ticket({'cas_host':chost
                                     ,'service':'http://'+testhost +':'+port+'/attributes'}))
          .use('/attributes'
               ,cas_validate.check_and_return({'cas_host':chost
                                               ,'service':'http://'+testhost +':'+port+'/attributes'}))
          .use('/attributes'
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
          .use(cas_validate.ticket({'cas_host':chost
                                    ,'service':'http://'+testhost +':'+port+'/'}))
          .use(cas_validate.check_or_redirect({'cas_host':chost
                                               ,'service':'http://'+testhost +':'+port+'/'}))
          .use('/',function(req, res, next){
              res.end('hello world')
          })
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    return new Promise((resolve,reject)=>{
        const server = http.createServer(app)
        server.listen(port, testhost, function(){
            console.log('server up and running',testhost,port)
            resolve({'server':server,
                     'store':store,
                     'port':port})
        })
    })

}


function close_server(server_store){
    const result = new Promise(resolve => {
        server_store.store.client.quit()
        server_store.server.close( (e,r)=>{
            return resolve()
        })
    })
    return result
}

async function no_session(t){
    const j = request.jar()

    const myport = server_store.port
    console.log('http://'+ testhost + ':' + myport + '/attributes')
    const result = new Promise((resolve,reject) => {
        request({'url': 'http://'+ testhost + ':' + myport + '/attributes'
                 , 'jar': j
                 ,agentOptions: {
                     rejectUnauthorized: false
                 }}
                , (e,r,b) => {
                    try {
                        t.notOk(e)
                        console.log('e is ',e)
                        //console.log('r is ',r)
                        console.log('b is ',b)
                        t.equal(r.statusCode,200)
                        t.ok(b)
                        t.same(JSON.parse(b),{})
                    }catch(e){
                        console.log(e)
                        t.fail()
                        return reject(e)
                    }
                    return resolve()
                });
    })
    await result
        .catch( e =>{
            console.log(e)
        })
    t.end()
    return close_server(server_store)
}

async function get_user_name(t){
    const j = request.jar()

    const myport = server_store.port
    const result = new Promise((resolve,reject) => {
        request({'url': 'http://'+ testhost + ':' + myport + '/attributes'
                 , 'jar': j
                 ,agentOptions: {
                     rejectUnauthorized: false
                 }}
                , (e,r,b) => {
                    try {
                        t.notOk(e)
                        //console.log('e is ',e)
                        //console.log('r is ',r)
                        console.log('b is ',b)
                        t.equal(r.statusCode,200)
                        t.ok(b)
                        t.same(JSON.parse(b),{})
                    }catch(e){
                        console.log(e)
                        t.fail()
                        return reject(e)
                    }
                    return resolve()
                });
    })
    await result
        .catch( e =>{
            console.log(e)
        })
    return t.end()

}

async function runit(){
    const _server_store = await setup_server()
    server_store.server = _server_store.server
    server_store.store = _server_store.store
    server_store.port = _server_store.port

    tap.test('should reply with an empty json object when no session is established',no_session)

    tap.end()
    await close_server(server_store)
}

runit()
