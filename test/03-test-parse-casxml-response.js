
const tap = require('tap')
const fs = require('fs')
const env = process.env;
const chost = env.CAS_HOST || 'cas';
const cport = env.CAS_PORT || '8443';
const cuser = env.CAS_USER || 'tuser';
const cpass = env.CAS_PASS || 'test';
const casservice = 'https://'+chost+':'+cport+'/cas'
const casurl = casservice + '/login'

const pem = require('pem');
//const trust_ca = fs.readFileSync('test/fixtures/keys/certificate.pem');

const testhost = env.CAS_VALIDATE_TEST_URL || 'cas_node_tests'
const testport = env.CAS_VALIDATE_TEST_PORT || 3000

const {promisify} = require('util');
const got = require('got')
const toughCookie = require('tough-cookie');


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

process.env.CAS_SESSION_TTL=2
const cas_validate = require('../lib/cas_validate')
const https = require('https')

var s, key, cert, caRootKey, caRootCert;
const pemCreateCertificate = promisify(pem.createCertificate)

function gen_root_pem(t) {
    //console.log('gen root pem')
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
    //console.log('gen pem')
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
    //console.log('opts is' )
    //console.log(opts)
    //console.log('--' )
    return opts
}


async function cas_login_function(cookieJar){

    // var opts ={'url':casurl
    //            , 'jar': j
    //            , 'agentOptions': {
    //                'rejectUnauthorized': false
    //            }
    //            ,"followRedirect":true
    //           }
    //console.log('logging in to ', casurl)
    // (async () => {
    //     try {
    //     	const response = await got('https://sindresorhus.com');
    //     	console.log(response.body);
    //     	//=> '<!doctype html> ...'
    //     } catch (error) {
    //     	console.log(error.response.body);
    //     	//=> 'Internal server error ...'
    //     }
    // })();
    const response = await got.post(casurl,{'cookieJar': cookieJar,
                                            // strictSSL: true,
		                            // ca: caRootCert,
                                            'rejectUnauthorized': false,
                                       //agent: keepaliveAgent,
                                       //accept:"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
                                       // headers:{
                                       //     'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0',


                                       //         }
                                      }
                              )
    //console.log(response.headers)
    //console.log(cookieJar)
    //console.log(response)
    const opts = _login_handler(response)
    //console.log(opts)

    //console.log('parsed response, going to log in with options:', opts)
    const login_response = await got.post(opts.url, {'cookieJar': cookieJar,
                                                     // strictSSL: true,
		                                     // ca: caRootCert,
                                                     'rejectUnauthorized': false,
                                                     form: opts.form,
                                                     // headers:{
                                                     //     'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0',


                                                     //         },
                                                     // hooks: {
		                                     //     beforeRequest: [
			                             //         async options => {
				                     //             console.log('options are\n', options)
			                             //         }
		                                     //     ]
	                                             // }
                                                    })

    // console.log('back from login attempt')
    // console.log(login_response.headers)
    // console.log(cookieJar)
    // console.log('asked for')
    // console.log(response.request)

    //console.log(login_response.body)


    const success_regex = /Log In Successful/i;
    if(success_regex.test(login_response.body)){
        //console.log('successful login. ')//, success_regex.exec(bb))
        return 'success'
    }else{
        //console.log('login failed, probably cookie issue',login_response.body)
        throw 'CAS login failed'
    }

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
    const port = testport
    const store = new RedisStore({host:redishost,  ttl: 100})
    const app = connect()
          .use(session({ 'store': store,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use('/attributes'
               ,cas_validate.ticket({'cas_host':'https://'+chost
                                     ,'cas_port':cport
                                     ,'service':'https://'+testhost +':'+port+'/attributes'}))
          .use('/attributes'
               ,cas_validate.check_and_return({'cas_host':chost
                                               ,'service':'https://'+testhost +':'+port+'/attributes'}))
          .use('/attributes'
               ,function(req,res,next){
                   //console.log('in /attributes, passed ticket and checks')

                   cas_validate.get_attributes(req,function(err,obj){
                       //console.log('got attributes', err, obj)
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
                                    ,'service':'https://'+testhost +':'+port+'/'}))
          .use(cas_validate.check_or_redirect({'cas_host':chost
                                               ,'service':'https://'+testhost +':'+port+'/'}))
          .use('/',function(req, res, next){
              res.end('hello world')
          })
          .use(function(req, res, next){
              res.statusCode = 404
              res.end('bad news kid\n')
              return null
          })
    return new Promise((resolve,reject)=>{

        const options = {
		key: key,
		cert: cert
        };

        const server = https.createServer(options,app)
        server.listen(port, testhost, function(){
            //console.log('server up:',testhost,port)
            resolve({'server':server,
                     'store':store,
                     'port':port})
        })
    })

}


function close_server(server_store){
    //console.log('closing server')
    const result = new Promise(resolve => {
        server_store.store.client.quit()
        server_store.server.close( (e,r)=>{
            //console.log('server closed')
            return resolve()
        })
    })
    return result
}

const no_session = async (t) => {
    const server_store = t.context.server_store
    const myport = server_store.port
    try {
        //console.log('no session', caRootCert)
        const response = await got('https://'+ testhost + ':' + myport + '/attributes',
                                   {
                                       // strictSSL: true,
		                       // ca: caRootCert,
                                       rejectUnauthorized: false,
                                       followRedirect: false,
                                    //headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0'}

                                   }
                                   // {strictSSL: true,
		                    // ca: caRootCert,
                                    // headers: { host: 'cas_node_tests' }}
		                  )
        //console.log('response is ',response.body)
        // console.log('e is ',e)
        //console.log('res is ',res)
        t.equal(response.statusCode,307)
        t.same(response.body,"")
        //t.end()
    }catch(e) {
        console.log(e)
        t.fail()
    }
}

const user_name_session = async (t)=>{

    //console.log('testing with a real user')
    const server_store = t.context.server_store
    const myport = server_store.port

    const cookieJar = new toughCookie.CookieJar();

    try {
        // set up a session with CAS server
        const result = await cas_login_function(cookieJar)

        try {
            const res = await got('https://'+ testhost + ':' + myport + '/attributes',
                                  {cookieJar,
                                   'rejectUnauthorized': false,
                                   // strictSSL: true,
		                   // ca: caRootCert,
                                   'responseType':'json'},
                                 )
            //console.log('back from attribute grab attempt')
            t.equal(res.statusCode,200)
            t.ok(res.body)
            const u = res.body
            const expected_fields = ["user_name","credentialType","authenticationDate","authenticationMethod"]
            expected_fields.forEach( (param) => {
                t.ok(u[param])
            })
        } catch(e) {
            console.error(e); // 30
        }
    }catch(e){
        console.log('login error?',e)
        t.fail('login error')
    }

}


const  main = async () => {
    //await tap.test('gen root pem', gen_root_pem)
    // var s, key, cert, caRootKey, caRootCert;
    caRootCert = fs.readFileSync('test/fixtures/keys/keystore_tests/root.pem', 'utf8')
    caRootKey  = fs.readFileSync('test/fixtures/keys/keystore_tests/root_key.pem', 'utf8')
    //console.log(caRootCert)
    await tap.test('gen pem',gen_pem)
    //cert = fs.readFileSync('test/fixtures/keys/keystore_tests/cas_node_tests.pem')
    //key = fs.readFileSync('test/fixtures/keys/keystore_tests/cas_node_tests_key.pem')

    const server_info = await setup_server()

    tap.context.server_store = server_info
    //test.context.server_store = server_info

    await tap.test('should reply with an empty json object when no session is established',no_session)
    await tap.test('should return the current user name when there is a session',user_name_session)
    //console.log('comes second')
    await close_server(server_info)
    //console.log('tests are all done!')
    tap.end()
}
main()
