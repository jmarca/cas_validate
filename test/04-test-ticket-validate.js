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
    console.log('gen root pem')
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
    console.log('gen pem')
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
                                       'rejectUnauthorized': false,
                                       //agent: keepaliveAgent,
                                       //accept:"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
                                       // headers:{
                                       //     'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0',


                                       //         }
                                      }
                                       // strictSSL: true,
		                      //  ca: caRootCert
                                      // }
                              )
    //console.log(response.headers)
    //console.log(cookieJar)
    //console.log(response)
    const opts = _login_handler(response)
    //console.log(opts)

    //console.log('parsed response, going to log in with options:', opts)
    const login_response = await got.post(opts.url, {'cookieJar': cookieJar,
                                                     'rejectUnauthorized': false,
                                                     form: opts.form,
                                                     // headers:{
                                                     //     'User-Agent':'Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0',


                                                     //         },
                                                     // strictSSL: true,
		                                     // ca: caRootCert}
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
        console.log('successful login. ')//, success_regex.exec(bb))
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
                   console.log('in /attributes, passed ticket and checks')

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
            console.log('server up:',testhost,port)
            resolve({'server':server,
                     'store':store,
                     'port':port})
        })
    })

}


function close_server(server_store){
    console.log('closing server')
    const result = new Promise(resolve => {
        server_store.store.client.quit()
        server_store.server.close( (e,r)=>{
            console.log('server closed')
            return resolve()
        })
    })
    return result
}

const giant_ticket = async (t) => {
    const server_store = t.context.server_store
    const myport = server_store.port


    const url = 'https://'+ testhost +':'+testport+'/?ticket=%22ST-cif 24r c;erc 24hih ct324nm 34ith lrtnf 34ihj glk3n4fi;h 34;li h3;4io h3;oi4h ioh ewrlf 34oi h3qwrifh3ith23o4ih3;oi4nf;o38h5y;oin3;oin3;4itjhw;einf;32i4hj;liwefn;32l4ihtn;wiefn;lvn3vl;i324jhtliweujtlk3n4l;3wi4jat/l4ij2;34ijtlwkqerfn;l3i4utop89hf;o34inla rti3q4;tihw;o4ietn2l34i;ht;oaiwrfnl34hta;o84yt;oingl3ns54giajewar;iona4l/5ktn;aienva/l4iht;aienrvl/i54ith23;45iht;aoin;4liaht;oaiwrhf;oi4na;ith;aivnc4;q;ih4;oainflqwek4ntql;iah;voinwletan;oivnq;l4itah/vinq/l4itna/irewht/lknq3/4l5iqthali/wcrn/ql34khtailw/n/4alith/%22'
    const response_promise =  got(
        url
        ,{followRedirect:false
          //,rejectUnauthorized: false
          // this works, as long as not hitting CAS test (Docker) server, which at the moment has the wrong set of keys
          ,strictSSL: true
	  ,ca: caRootCert
         })
          .then((r)=>{
              t.equal(r.statusCode,307)
              t.equal(r.headers.location,casurl+'?service=https%3A%2F%2F'+ testhost +'%3A'+testport+'%2F')
              t.same(r.body,"")
              t.end()
          })
          .catch((e)=>{
              console.log('error in giant ticket',e)
              t.fail()
              t.end()
          })
    return response_promise
}


const  main = async () => {
    await tap.test('gen root pem', gen_root_pem)
    await tap.test('gen pem',gen_pem)
    const server_info = await setup_server()

    tap.context.server_store = server_info
    //test.context.server_store = server_info

    await tap.test('should reject a giant ticket',giant_ticket)

    await close_server(server_info)
    console.log('tests are all done!')
    tap.end()
}
main()
