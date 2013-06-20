/*global before after */
// this test makes sure that various broken tickets don't work

/* global require console process describe it */

var should = require('should')

var ticket = require('../lib/ticket')
var request = require('request')
var connect = require('connect')
var RedisStore = require('connect-redis')(connect);


var chost =  process.env.CAS_HOST;
var casservice = 'https://'+chost+'/'
var casurl = casservice + 'cas/login'

var testhost = process.env.CAS_VALIDATE_TEST_URL || '127.0.0.1'
var testport = process.env.CAS_VALIDATE_TEST_PORT || 3000

describe('ticket',function(){
    var server
    before(
        function(done){
            var app = connect()
                      .use(connect.cookieParser('barley Waterloo Napoleon loser'))
                      .use(connect.session({store: new RedisStore({ttl: 1})}))
                      .use(ticket({'cas_host':chost
                                  ,'service':'http://'+testhost+':'+testport+'/'}))
                      .use(function(req, res, next){
                          res.end('hello world')
                          return null
                      })
            server = app.listen(testport,done)
            return null
        })
    after(function(done){
        server.close(done)
    })


    it('should rebuff a giant ticket',function(done){
        request({url:'http://'+ testhost +':'+testport+'/?ticket=%22ST-cif 24r c;erc 24hih ct324nm 34ith lrtnf 34ihj glk3n4fi;h 34;li h3;4io h3;oi4h ioh ewrlf 34oi h3qwrifh3ith23o4ih3;oi4nf;o38h5y;oin3;oin3;4itjhw;einf;32i4hj;liwefn;32l4ihtn;wiefn;lvn3vl;i324jhtliweujtlk3n4l;3wi4jat/l4ij2;34ijtlwkqerfn;l3i4utop89hf;o34inla rti3q4;tihw;o4ietn2l34i;ht;oaiwrfnl34hta;o84yt;oingl3ns54giajewar;iona4l/5ktn;aienva/l4iht;aienrvl/i54ith23;45iht;aoin;4liaht;oaiwrhf;oi4na;ith;aivnc4;q;ih4;oainflqwek4ntql;iah;voinwletan;oivnq;l4itah/vinq/l4itna/irewht/lknq3/4l5iqthali/wcrn/ql34khtailw/n/4alith/%22'
                ,followRedirect:false
                }
               ,function(e,r,b){
                    r.statusCode.should.equal(307)
                    r.headers.location.should.equal(casurl+'?service=http%3A%2F%2F'+ testhost +'%3A'+testport+'%2F')
                    should.not.exist(b)
                    done()
                })
    })
})
