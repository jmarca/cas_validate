
const tap = require('tap')

const env = process.env;
const chost = env.CAS_HOST || 'cas';
const cport = env.CAS_PORT || '8443';
const cuser = env.CAS_USER;
const cpass = env.CAS_PASS;

const testhost = env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
var testport = env.CAS_VALIDATE_TEST_PORT || 3000

const sa = require('superagent')
const agent = sa.agent();
const redishost = env.REDIS_HOST || 'redis'
const redis = require('redis')

const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const connect = require('connect')

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')
const http = require('http')

var client

function setup_server(){
    const port = testport++
    const store = new RedisStore({host:redishost,  ttl: 100})
    const app = connect()
          .use(session({ 'store': store,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use(cas_validate.redirect({'cas_host':chost
                                      ,'cas_port':cport
                                      ,'service':'http://'+ testhost +':'+port+'/index.html'})
              )
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    return new Promise((resolve,reject)=>{
        const server = http.createServer(app)
        server.listen(port, testhost, function(){
            resolve({'server':server,
                     'store':store,
                     'port':port})
        })
    })

}
function setup_server_http(){
    const port = testport++
    const store = new RedisStore({host:redishost,  ttl: 100})
    const app = connect()
          .use(session({ 'store': store,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use(cas_validate.redirect({'cas_host':'http://'+chost
                                      ,'cas_port':80
                                      ,'service':'http://'+ testhost +':'+port+'/index.html'})
              )
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    return new Promise((resolve,reject)=>{
        const server = http.createServer(app)
        server.listen(port, testhost, function(){
            resolve({'server':server,
                     'store':store,
                     'port':port})
        })
    })
}
function setup_server_https(){
    const port = testport++
    const store = new RedisStore({host:redishost,  ttl: 100})
    const app = connect()
          .use(session({ 'store': store,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use(cas_validate.redirect({'cas_host':'https://'+chost
                                      ,'cas_port':443
                                      ,'service':'http://'+ testhost +':'+port+'/index.html'})
              )
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    return new Promise((resolve,reject)=>{
        const server = http.createServer(app)
        server.listen(port, testhost, function(){
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

function server_test(setup,casport){

    async function handler (t){
        const casservice = 'https://'+chost+':'+casport+'/'
        const casurl = casservice + 'cas/login'
        const server_store = await setup()
        const myport = server_store.port
        const result = await agent
              .get('http://'+ testhost +':'+myport+'/')
              .ok(res => res.status < 400)
              .redirects(0)

              .then( res => {
                  t.is(res.status,307)
                  t.is(res.headers.location,casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+myport+'%2Findex.html')
              }).catch(e=>{
                  console.log('agent get threw up')
                  console.log(e)
                  t.fail(e)
              }).then(()=>{
                  t.end()
              }).then(()=>{
                  return close_server(server_store)
              })
        //console.log('hate coursing through your veins')
    }
    return handler
}


function runit() {
    return tap.test('initialize server',server_test(setup_server,'8443'))
        .then(()=>{
            tap.test('initialize server http',server_test(setup_server_http,'80'))
        })
        .then(()=>{
            tap.test('initialize server https',server_test(setup_server_https,'443'))
        })
        .then(()=>{
            tap.end()
        })
}

runit()
