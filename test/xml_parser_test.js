/*global before */
var should = require('should')

var parser_maker = require('../lib/xml_parser.js')
var request = require('request')

var env = process.env;

var testhost = env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
var testport = env.CAS_VALIDATE_TEST_PORT || 3000

testport += 2

var express = require('express')
before(function(done){
    // a small server to run while testing the UI


    var app = express().use(express.logger())
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
    app.use(express.static('test/files'))
    app.listen(testport,testhost,function(){
        return done()
    })
    return null
})

var RedisStore = require('connect-redis')(express);

describe('get a user doc, parse the umlaut',function(){
    it('should parse the umlaut just fine'
      ,function(done){
           var port = testport+1
           var srvr = express().use(express.logger())
           srvr.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
           .use(express.cookieParser('barley wheat napoleon'))
           .use(express.session({ store: new RedisStore }))
           srvr.get('/test', function(req, res){
               // short circuit a real request cycle
               req.session.ticket='testingticket'

               var parser = parser_maker.make_xml_parser(req,res,function(e){
                                req.session.name.should.eql('h_mueller')
                                var attrs = req.session.attributes
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
               request.get('http://'+testhost+':'+testport+'/cas_auth.xml'
                          ,function(e,r,b){
                               should.not.exist(e)
                               parser(b)
                               return  null
                           })

           });
           srvr.listen(port,testhost,function(){
               var j = request.jar()
               request({'uri':'http://'+testhost+':'+port+'/test'
                       ,'jar':j}
                      ,function(e,r,b){
                           return null
                       })

           })
           return null
       })
})
describe('handle a failed session login',function(){
    it('should parse fail xml response just fine'
      ,function(done){
           var port = testport+2
           var srvr = express().use(express.logger())
           srvr.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
           .use(express.cookieParser('barley wheat napoleon'))
           .use(express.session({ store: new RedisStore }))
           srvr.get('/test', function(req, res){
               // short circuit a real request cycle
               req.session.ticket='testingticket'

               var parser = parser_maker.make_xml_parser(req,res,function(e){
                            })
               request.get('http://'+testhost+':'+testport+'/cas_fail.xml'
                          ,function(e,r,b){
                               should.not.exist(e)
                               parser(b)
                               return  null
                           })

           });
           srvr.listen(port,testhost,function(){
               var j = request.jar()
               request({'uri':'http://'+testhost+':'+port+'/test'
                       ,'jar':j
                       ,'followRedirect':false}
                      ,function(e,r,b){
                           // should have received a 307
                           r.statusCode.should.equal(307)
                           return done()
                       })
           })
           return null
       })
})

// the other xml file from github
describe('get a user doc, parse it',function(){
    it('should parse the alternate attribute serving method just fine'
      ,function(done){
           var port = testport+3
           var srvr = express().use(express.logger())
           srvr.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
           .use(express.cookieParser('barley wheat napoleon'))
           .use(express.session({ store: new RedisStore }))
           srvr.get('/test', function(req, res){
               // short circuit a real request cycle
               req.session.ticket='testingticket'

               var parser = parser_maker.make_xml_parser(req,res,function(e){
                                req.session.name.should.eql('bob')
                                var attrs = req.session.attributes
                                attrs.should.have.keys(['mail'
                                                       ,'uid'
                                                       ,'cn'
                                                       ,'givenname'
                                                       ,'service'
                                                       ,'permission'
                                                       ,'uidnumber'
                                                       ])

                                attrs['mail'      ].should.equal('bob@mail.com')
                                attrs['uid'       ].should.equal('b01234')
                                attrs['cn'        ].should.equal('smith')
                                attrs['givenname' ].should.equal('bob')
                                attrs['service'   ].should.equal('other')
                                attrs['permission'].should.eql(['p1','p2','p3'])
                                attrs['uidnumber' ].should.equal('123456789')

                                return done()
                            })
               request.get('http://'+testhost+':'+testport+'/cas_auth_2.xml'
                          ,function(e,r,b){
                               should.not.exist(e)
                               parser(b)
                               return  null
                           })

           });
           srvr.listen(port,testhost,function(){
               var j = request.jar()
               request({'uri':'http://'+testhost+':'+port+'/test'
                       ,'jar':j}
                      ,function(e,r,b){
                           return null
                       })

           })
           return null
       })
})
