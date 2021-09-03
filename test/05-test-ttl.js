const tap = require('tap')
const fs = require('fs')
const env = process.env;
const chost = env.CAS_HOST || 'cas';
const cport = env.CAS_PORT || '8443';
const cuser = env.CAS_USER || 'tuser';
const cpass = env.CAS_PASS || 'test';
const casservice = 'https://'+chost+':'+cport+'/cas'
const casurl = casservice + '/login'

const _ = require('lodash')

const pem = require('pem');

const testhost = env.CAS_VALIDATE_TEST_URL || 'cas_node_tests'
const testport = env.CAS_VALIDATE_TEST_PORT || 3000

const {promisify} = require('util');
const got = require('got')
const toughCookie = require('tough-cookie');

const sleep = promisify(setTimeout);

// const agentOptions = {
//     host: 'www.example.com'
//     , port: '443'
//     , path: '/'
//     , rejectUnauthorized: false
// }

const redishost = env.REDIS_HOST || 'redis'
const redis = require('redis')

const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const connect = require('connect')

// create a global redis client for all tests

const redclient = redis.createClient({host:redishost});
redclient.on("ready", ()=>{
    console.error('redis client ready');
});
redclient.on("error", function(error) {
    console.error(error);
    //throw new Error(error)
});
// promisify the redis methods I use

const keysAsync = promisify(redclient.keys).bind(redclient);

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')
const https = require('https')

var s, key, cert, caRootKey, caRootCert;
const pemCreateCertificate = promisify(pem.createCertificate)

function gen_root_pem(t) {
    // console.log('gen root pem')
    return pemCreateCertificate({days:1, selfSigned:true})
        .then( (keys)=>{
	    caRootKey = keys.serviceKey;
	    caRootCert = keys.certificate;
            t.end()
        })
        .catch ((error)=>{
            console.log('fidget spinners!  pem create certificate failed', error)
            t.fail()
        })
}

function gen_pem(t) {
    // console.log('gen pem')
    return pemCreateCertificate({
	serviceCertificate: caRootCert,
	serviceKey: caRootKey,
	serial: Date.now(),
	days: 500,
	country: '',
	state: '',
	locality: '',
	organization: '',
	organizationUnit: '',
	commonName: 'cas_node_tests'
    })
        .then( (keys)=>{
	    key = keys.clientKey;
	    cert = keys.certificate;
            t.end()
        })
        .catch ((error)=>{
            console.log('croc gibbets!  pem create certificate failed', error)
            t.fail()
        })
}

// need to set up a server running bits and pieces of cas validate to test this properly.
// because the tests are responding to incoming connections.

function _login_handler(b){
    //console.log(b)
    // parse the body for the form url, with the correct jsessionid
    var form_regex = /id="fm1".*action="(.*)">/;
    var result = form_regex.exec(b.body)
    //console.log("login handler form parse is ", result[0], result[1])
    var opts={}
    opts.url=casservice+'/'+result[1]
    opts.form={'username':cuser
               ,'password':cpass
               ,'submit':'LOGIN'
              }
    // scrape hidden input values
    var name_regex = /name="(.*?)"/
    var value_regex = /value="(.*?)"/
    var hidden_regex = /<input.*?type="hidden".*?\/>/g
    while ((result = hidden_regex.exec(b.body)) !== null)
    {
        //console.log("hidden form value:", result[0])
        var n = name_regex.exec(result[0])
        var v = value_regex.exec(result[0])
        if (v){
            opts.form[n[1]]=v[1]
        }else{
            opts.form[n[1]]=''
        }
    }
    return opts
}


async function cas_login_function(cookieJar){

    const response = await got.post(casurl,{'cookieJar': cookieJar,
                                            'rejectUnauthorized': false,
                                            // strictSSL: true,
		                            //  ca: caRootCert
                                           }
                              )
    const opts = _login_handler(response)
    const login_response = await got.post(opts.url, {'cookieJar': cookieJar,
                                                     'rejectUnauthorized': false,
                                                     form: opts.form,
                                                     // strictSSL: true,
		                                     // ca: caRootCert}
                                                    })

    const success_regex = /Log In Successful/i;
    if(success_regex.test(login_response.body)){
        //console.log('successful login. ')//, success_regex.exec(bb))
        return 'success'
    }else{
        //console.log('login failed, probably cookie issue',login_response.body)
        throw 'CAS login failed'
    }

}

async function cas_logout_function(cookieJar){
    var logouturl = casservice +  '/logout';
    const result = await got(logouturl, {cookieJar,
                          'rejectUnauthorized':false
                          // strictSSL: true,
		          // ca: caRootCert}
                         })
    // give cas server a chance to fire off its posts
    // in response to logout event
    await sleep(100)
    return null
}

const baseUrl = 'https://'+ testhost +':'+testport+'/'
function setup_server(store_ttl){

    const port = testport
    let redisClient = redis.createClient( {host:redishost})
    const store1 = new RedisStore({ client: redisClient, ttl: store_ttl * process.env.CAS_SESSION_TTL})

    let redisClient2 = redis.createClient( {host:redishost})
    const store2 = new RedisStore({client: redisClient2,  ttl: store_ttl * process.env.CAS_SESSION_TTL})
    const app = connect()
          .use(session({ 'store': store1,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use('/username',function(req,res,next){
              cas_validate.get_username(req,function(err,obj){

                  res.setHeader('Content-Type','application/json');
                  res.end(JSON.stringify(obj))
                  return null
              })
          })
          .use('/quit',cas_validate.logout({
              'cas_host':'https://'+chost,
              'cas_port':cport,
              'service':'https://'+testhost+':'+testport}))
          .use(cas_validate.ssoff())
          .use(cas_validate.ticket({'cas_host':'https://'+chost
                                    ,'cas_port':cport
                                    ,'service':'https://'+testhost+':'+testport}))
          .use(cas_validate.check_and_return({'cas_host':'https://'+chost
                                              ,'cas_port':cport
                                              ,'service':'https://'+testhost+':'+testport}))

          .use(function(req, res, next){
              if(req.session.st){
                  return res.end('hello '+req.session.name)
              }else{
                  return res.end('hello world (not logged in)')
              }
          })


    const login = connect()
          .use(session({ 'store': store2,
                         secret:'6ft barley at Waterloo',
                         'resave': false,
                         'saveUninitialized': true,
                       }))
          .use('/login',cas_validate.check_or_redirect({'cas_host':'https://'+chost
                                                        ,'cas_port':cport
                                                        ,'service':'https://'+testhost+':'+testport+'/'}))
          .use('/',app)

    return new Promise((resolve,reject)=>{

        const options = {
		key: key,
		cert: cert
        };

        const server = https.createServer(options,login)

        server.listen(port, testhost, function(){
            console.log('server up:',testhost,port)
            resolve({'server':server,
                     'store1':store1,
                     'store2':store2,
                     'port':port})
        })
    })

}


function close_server(server_store){
    const result = new Promise(resolve => {
        server_store.store1.client.quit()
        server_store.store2.client.quit()
        server_store.server.close( (e,r)=>{
            return resolve()
        })
    })
    return result
}


const dont_sprout_keys = async (t) => {

    process.env.CAS_SESSION_TTL=2
    const server_info = await setup_server(2)

    const cookieJar = new toughCookie.CookieJar();
    const client = got.extend({
	prefixUrl: baseUrl,
	cookieJar,
        'rejectUnauthorized':false,
        // strictSSL: true,
	// ca: caRootCert,
    });
    // var response = await client('/')
    // console.log('got response to /')
    // console.log(response.body)

    const keys = await keysAsync('ST*')
    // now login
    const result = await cas_login_function(cookieJar)

    var response = await client('/')

    t.is(response.statusCode, 200)
    t.ok(response.body)
    t.equal(response.body,'hello '+cuser)

    const newkeys = await keysAsync('ST*')
    t.notSame(newkeys,keys)
    const diff = _.difference(newkeys,keys)
    t.ok(diff.length)
    t.is(diff.length,1)

    response = await client.get('username')

    t.is(response.statusCode, 200)
    t.ok(response.body)
    //console.log(response.body)
    const body=JSON.parse(response.body)
    t.ok(body.user_name)
    t.same(body.user_name,cuser)

    const notnewkeys = await keysAsync('ST*')
    t.notSame(notnewkeys,keys)
    t.same(notnewkeys,newkeys)

    // now logout
    response = await client('quit')
    t.is(response.statusCode,200)
    t.ok(response.body)
    t.equal(response.body,'hello world (not logged in)')

    return await close_server(server_info)
}



const timeout_keys = async (t) => {
    process.env.CAS_SESSION_TTL=2
    const server_info = await setup_server(2)
    const cookieJar = new toughCookie.CookieJar();
    const client = got.extend({
	prefixUrl: baseUrl,
	cookieJar,
        'rejectUnauthorized':false,
        // strictSSL: true,
	// ca: caRootCert,
    });

    const keys = await keysAsync('ST*')
    // now login
    const result = await cas_login_function(cookieJar)
    var response = await client('/')
    t.is(response.statusCode, 200)
    t.ok(response.body)
    t.equal(response.body,'hello '+cuser)

    var newkeys = await keysAsync('ST*')
    t.notSame(newkeys,keys)
    var diff = _.difference(newkeys,keys)
    t.ok(diff.length)
    t.is(diff.length,1)

    // pause for ttl seconds, then re-check redis
    const ts = Date.now()

    console.log('sleeping to test timeout')
    await sleep(process.env.CAS_SESSION_TTL*1000)
    newkeys = await keysAsync('ST*')
    diff = _.difference(newkeys,keys)
    t.same(diff,[])

    // but the session is still valid
    response = await client.get('username')
    t.is(response.statusCode, 200)
    t.ok(response.body)
    //console.log(response.body)
    var body=JSON.parse(response.body)
    t.ok(body.user_name)
    t.same(body.user_name,cuser)

    // and logging out of CAS (directly, not via /quit) will NO LONGER
    // CAUSE Single Sign Out!!!

    // console.log('call cas logout function')
    response = await cas_logout_function(cookieJar)

    // but still, the session is valid
    // console.log('get username again')
    response = await client.get('username')
    t.is(response.statusCode, 200)
    t.ok(response.body)
    //console.log(response.body)
    body=JSON.parse(response.body)
    t.ok(body.user_name)
    t.same(body.user_name,cuser)

    // but pause for > ttl * 2 (what I've set the connect session
    // length to be), and all is well
    console.log('sleeping to test timeout')
    await sleep(process.env.CAS_SESSION_TTL*3*1000)
    // console.log('second sleep, elapsed time is now ', Date.now()-ts, ' milliseconds')

    // and now, the session is invalid because the ttl of 2*cas_session_ttl has expired
    response = await client.get('username')
    t.is(response.statusCode, 200)
    t.ok(response.body)
    //console.log(response.body)
    body=JSON.parse(response.body)
    t.same(body,{})

    return await close_server(server_info)
}

const timeout_keys2 = async (t) => {
    process.env.CAS_SESSION_TTL=2
    const server_info = await setup_server(1)
    const cookieJar = new toughCookie.CookieJar();
    const client = got.extend({
	prefixUrl: baseUrl,
	cookieJar,
        'rejectUnauthorized':false,
        // strictSSL: true,
	// ca: caRootCert,
    });

    const keys = await keysAsync('ST*')
    // now login
    const result = await cas_login_function(cookieJar)
    var response = await client('/')
    t.is(response.statusCode, 200)
    t.ok(response.body)
    t.equal(response.body,'hello '+cuser)

    var newkeys = await keysAsync('ST*')
    t.notSame(newkeys,keys)
    var diff = _.difference(newkeys,keys)
    t.ok(diff.length)
    t.is(diff.length,1)

    // pause for ttl seconds, then re-check redis
    const ts = Date.now()

    console.log('sleeping to test timeout')
    await sleep(process.env.CAS_SESSION_TTL*1000)
    // console.log('slept for ', Date.now()-ts, ' milliseconds')
    newkeys = await keysAsync('ST*')
    diff = _.difference(newkeys,keys)
    t.same(diff,[])

    // and this time, because ttl is the same, the session has also
    // timed out and is no longer valid
    response = await client.get('username',
                                {followRedirect:false})
    t.is(response.statusCode, 200)
    t.ok(response.body)
    var body=JSON.parse(response.body)
    t.same(body,{})

    return await close_server(server_info)
}




const  main = async () => {
    await tap.test('gen root pem', gen_root_pem)
    await tap.test('gen pem',gen_pem)

    //tap.context.server_store = server_info
    //test.context.server_store = server_info

    await tap.test('do not sprout extra keys in redis',dont_sprout_keys)
    await tap.test('testing timeout of keys', timeout_keys)
    await tap.test('testing timeout of keys part 2', timeout_keys2)
    redclient.quit()

    console.log('tests are all done!')
    tap.end()
}
main()
