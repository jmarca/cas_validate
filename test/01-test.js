
const tap = require('tap')

const env = process.env;
const chost = env.CAS_HOST || 'cas';
const cport = env.CAS_PORT || '8443';
const cuser = env.CAS_USER;
const cpass = env.CAS_PASS;
const casservice = 'https://'+chost+':'+cport+'/'
const casurl = casservice + 'cas/login'

const testhost = env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
const testport = env.CAS_VALIDATE_TEST_PORT || 3000

const sa = require('superagent')
const agent = sa.agent();
const redishost = env.REDIS_HOST || 'redis'

const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const connect = require('connect')

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')
const http = require('http')

var server
function setup_server(t){
    const app = connect()
          .use(session({ store: new RedisStore({host:redishost,
                                               }),
                         secret: 'barley waterloo napoleon',
                         resave: false,
                         saveUninitialized: true,

                       }))
          .use(cas_validate.redirect({'cas_host':chost
                                      ,'service':'http://'+ testhost +':'+testport+'/index.html'})
              )
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    server = http.createServer(app)
    t.context.server = server
    server.listen(testport, testhost, function(){
        // standard node-style callback
        // if you call this with an error, it'll blow up
        console.log('listening on ',testhost,testport)
        t.pass('relax')
        t.end()
    })
}

tap.test('server test',async (t)=>{


    tt = await t.test('setup server',setup_server)
    console.log('server is?', server)

    await t.test('should redirect when no session is established', tt => {
        agent
            .get('http://'+ testhost +':'+testport+'/')
            .ok(res => res.status < 400)
            .redirects(0)

            .then( res => {
                console.log('back from server with ',res.status)
                tt.is(res.status,307)
                tt.is(res.headers.location,casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2Findex.html')
                console.log('did it work?')
            }).catch(e=>{
                console.log('agent get threw up')
                console.log(e)
            }).then(()=>{
                console.log('calling tt.end')
                tt.end()
            })
    })

    console.log('hate coursing through your veins')

    t.test(async (tt) =>{
        console.log('closing server')
        await   new Promise(resolve => {
            server.close( (e,r)=>{
                console.log('server closed')
                console.log('e is',e)
                console.log('r is',r)
                resolve('resolved');
                tt.pass()
            })
        })
    }).then( ()=>{
        console.log('are we done with teardown?')
        t.end()

    })

})
