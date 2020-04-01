const tap = require('tap')
const fs = require('fs')
const env = process.env;

const _ = require('lodash')

const pem = require('pem');

const testhost = env.CAS_VALIDATE_TEST_URL || 'cas_node_tests'
const testport = env.CAS_VALIDATE_TEST_PORT || 3000
const fakeport = testport + 1

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
const express = require('express')

// create a global redis client for all tests


process.env.CAS_SESSION_TTL=2
const parser_maker = require('../lib/xml_parser.js')
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
const getter = got.extend({
        'rejectUnauthorized':false,
        // strictSSL: true,
	// ca: caRootCert,
    });


function fake_cas_server(){

    const app = express()
          .use(express.static('test/files'))

    return new Promise((resolve,reject)=>{

        const options = {
	    key: key,
	    cert: cert
        };

        const server = https.createServer(options,app)

        server.listen(fakeport, testhost, function(){
            console.log('server up:',testhost,fakeport)
            resolve({'server':server,
                     'port':fakeport})
        })
    })

}

function test_umlaut(t){

    const port = testport
    const store1 = new RedisStore({host:redishost,  ttl: 2})
    const app = connect()
          .use(session({ 'store': store1,
                         'secret': 'barley waterloo napoleon',
                         'resave': false,
                         'saveUninitialized': true,

                       }))
          .use('/test',function(req,res,next){

              req.session.ticket='testingticket'
              var parser = parser_maker.make_xml_parser(req,res,function(e){
                  t.equals(req.session.name,'h_mueller')
                  const attrs = req.session.attributes
                  t.has(Object.keys(attrs),['mail'
                                            ,'__AUTHUSERCONTEXT__'
                                            ,'cn'
                                            ,'__AUTHTYPE__'
                                            ,'surname'
                                            ,'tudUserUniqueID'
                                            ,'givenName'
                                           ], {'sort':true})
                  t.equals(attrs.mail,'a.b@c.de')


                  t.equals(attrs['__AUTHUSERCONTEXT__'], 'cont' )
                  t.equals(attrs['cn'], 'commonname' )
                  t.equals(attrs['__AUTHTYPE__'], 'TUID' )
                  t.equals(attrs['surname'], 'Müller' )
                  t.equals(attrs['tudUserUniqueID'], '1234567' )
                  t.equals(attrs['givenName'], 'Hans' )
                  res.end("ok")
              })
              // hit the fake cas server
              return getter('https://'+testhost+':'+fakeport+'/cas_auth.xml')
                  .then((res)=>{
                      // parse the doc locally
                      parser(res.body)
                  })
          })

    return new Promise((resolve,reject)=>{

        const options = {
		key: key,
		cert: cert
        };

        const server = https.createServer(options,app)

        server.listen(port, testhost, function(){
            console.log('server up:',testhost,port)
            // run the test
            const server_store = {'server':server,
                                  'store':store1,
                                 }
            getter('https://'+testhost+':'+port+'/test')
                .then (()=>{
                    t.end()
                    return resolve()
                },(e)=>{
                    t.fail()
                    return reject(e)
                })
                .then(async ()=>{
                    await close_server(server_store)
                })
        })
    })

}

function close_server(server_store){
    const result = new Promise(resolve => {
        if (server_store.store){
            server_store.store.client.quit()
        }
        server_store.server.close( (e,r)=>{
            return resolve()
        })
    })
    return result
}


const  main = async () => {
    await tap.test('gen root pem', gen_root_pem)
    await tap.test('gen pem',gen_pem)
    const server_store = await fake_cas_server()
    await tap.test('parse umlaut correctly',test_umlaut)
    console.log('tests are all done!')
    close_server(server_store)
    tap.end()
}
main()
