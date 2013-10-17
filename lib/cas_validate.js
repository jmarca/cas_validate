/**
 * CAS validate:  validate requests via CAS service tickets
 *
 * Options:
 *
 *   - `serivce`  the service url we are checking.  probably best to leave it blank
 *   - `cas_host` the CAS host.  will fallback to environment variable CAS_HOST
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

// fixme, put in the global init here, if/when I ever decide to write that


exports.redirect = require('./redirect').redirect
exports.check_and_return = require('./redirect').check_and_return
exports.check_or_redirect = require('./check_or_redirect')
// note that ticket include xml parsing now, should eventually
// include json as an option
exports.ticket = require('./ticket')
exports.ssoff = require('./ssoff')
exports.logout = require('./logout')
exports.get_username = require('./getUsername');
exports.get_attributes = require('./getAttributes');
exports.session_or_abort = require('./session_or_abort');
