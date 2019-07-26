const tap = require('tap')
const force_protocol = require('../lib/force_protocol');

function test_force_protocol (t) {

    t.is(force_protocol('cas.staging.localhost'),'https://cas.staging.localhost')
    t.is(force_protocol('cas.staging.localhost:8443'),'https://cas.staging.localhost:8443')
    t.is(force_protocol('http://cas.staging.localhost'),'https://cas.staging.localhost')
    t.is(force_protocol('https://cas.staging.localhost'),'https://cas.staging.localhost')
    t.is(force_protocol('http://cas.staging.localhost:8443'),'https://cas.staging.localhost:8443')
    t.is(force_protocol('https://cas.staging.localhost:8443'),'https://cas.staging.localhost:8443')
    t.is(force_protocol('cas.staging.localhost/this/is/a/path'),'https://cas.staging.localhost')
    t.is(force_protocol('cas.staging.localhost:8443/this/is/a/path'),'https://cas.staging.localhost:8443')
    t.is(force_protocol('http://cas.staging.localhost/this/is/a/path'),'https://cas.staging.localhost')
    t.is(force_protocol('http://cas.staging.localhost:8443/this/is/a/path'),'https://cas.staging.localhost:8443')
    t.is(force_protocol('https://cas.staging.localhost:8443/this/is/a/path'),'https://cas.staging.localhost:8443')
    t.end()
}

tap.test('test force_protocol functionality',test_force_protocol)
tap.end()
