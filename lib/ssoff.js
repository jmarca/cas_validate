var logger = require('./logger')('cas_validate::ssoff')
var invalidate = require('./invalidate')

function ssoff(){
    return function(req,res,next){
        logger.debug('in ssoff')
        var method = req.method.toLowerCase();
        if (method == 'post'){
            return invalidate(req,res,next);
        }else{
            logger.debug('not a post')
            next();
        }
        return null;
    }
}
module.exports=ssoff
