/*global before */
var should = require('should')

var parser_maker = require('../lib/xml_parser.js')
var request = require('request')

var env = process.env;
var chost = env.CAS_HOST;
var cuser = env.CAS_USER;
var cpass = env.CAS_PASS;
var casservice = 'https://'+chost+'/'
var casurl = casservice + 'cas/login'

var testhost = env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
var testport = env.CAS_VALIDATE_TEST_PORT || 3000

testport += 2

before(function(done){
    // a small server to run while testing the UI

    var express = require('express')

    var app = express().use(express.logger())
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
    app.use(express.static('test/files'))
    app.listen(testport,testhost,function(){
        return done()
    })
    return null
})

// after kill the server?

describe('get a user doc, parse the umlaut',function(){
    it('should parse the umlaut just fine'
      ,function(done){
           var _req = {'session':{'attributes':{}
                                 ,'ticket':'blah blah'
                                 }
                      }
           var _res = {} // don't need for res to do anything in this test
           var parser = parser_maker.make_xml_parser(_req,_res,function(e){
                            console.log(_req)
                            _req.session.name.should.eql('h_mueller')
                            var attrs = _req.session.attributes
                            attrs.should.have.keys(['mail'
                                                   ,'__AUTHUSERCONTEXT__'
                                                   ,'cn'
                                                   ,'__AUTHTYPE__'
                                                   ,'surname'
                                                   ,'tudUserUniqueID'
                                                   ,'givenName'
                                                   ])
                            attrs.mail.should.equal('a.b@c.de')


                            attrs[ '__AUTHUSERCONTEXT__'].should.equal( 'cont' )
                            attrs[ 'cn'].should.equal( 'commonname' )
                            attrs[ '__AUTHTYPE__'].should.equal( 'TUID' )
                            attrs[ 'surname'].should.equal( 'Müller' )
                            attrs[ 'tudUserUniqueID'].should.equal( '1234567' )
                            attrs[ 'givenName'].should.equal( 'Hans' )
                            return done()
                        })
           request.get('http://'+testhost+':'+testport+'/cas_auth.xml',function(e,r,b){
               //console.log(r)
               should.not.exist(e)
               parser(b)
               return  null
           })
           return null
       })
})
