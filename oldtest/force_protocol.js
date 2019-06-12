var should = require('should');
var force_protocol = require('../lib/force_protocol');

describe('force_protocol',function() {
  it('should parse a hostname', function(done) {
    force_protocol('cas.staging.localhost').should.equal('https://cas.staging.localhost')
    done()
  })
  it('should parse a host:port combo', function(done) {
    force_protocol('cas.staging.localhost:8443').should.equal('https://cas.staging.localhost:8443')
    done()
  })
  it('should parse a https?://host combos', function(done) {
    force_protocol('http://cas.staging.localhost').should.equal('https://cas.staging.localhost')
    force_protocol('https://cas.staging.localhost').should.equal('https://cas.staging.localhost')
    done()
  })
  it('should parse a https?://host:port combos', function(done) {
    force_protocol('http://cas.staging.localhost:8443').should.equal('https://cas.staging.localhost:8443')
    force_protocol('https://cas.staging.localhost:8443').should.equal('https://cas.staging.localhost:8443')
    done()
  })
  it('should discard any path elements', function(done) {
    force_protocol('cas.staging.localhost/this/is/a/path').should.equal('https://cas.staging.localhost')
    force_protocol('cas.staging.localhost:8443/this/is/a/path').should.equal('https://cas.staging.localhost:8443')
    force_protocol('http://cas.staging.localhost/this/is/a/path').should.equal('https://cas.staging.localhost')
    force_protocol('http://cas.staging.localhost:8443/this/is/a/path').should.equal('https://cas.staging.localhost:8443')
    force_protocol('https://cas.staging.localhost:8443/this/is/a/path').should.equal('https://cas.staging.localhost:8443')
    done()
  })
})
