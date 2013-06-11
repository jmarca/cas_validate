var winston = require("winston");
var env = process.env;

// set up logging per: https://gist.github.com/spmason/1670196
function get_logger(label, filename){
    if(!filename){
        filename = __dirname + '/application.log'
    }
    var logger = new winston.Logger()
    var production = (env.NODE_ENV || '').toLowerCase() === 'production';
    // express/connect also defaults to looking at env.NODE_ENV

    // Override the built-in console methods with winston hooks
    var loglevel = env.CAS_VALIDATE_LOGLEVEL || env.LOGLEVEL || 'info'

    switch(((env.NODE_ENV) || '').toLowerCase()){
        case 'production':
        production = true
        loglevel='warn'
        logger.add(winston.transports.File,
                   {filename: filename
                   ,handleExceptions: true
                   ,exitOnError: false
                   ,level: 'warn'
                   ,label: label
                   });
        break
        case 'development':
        loglevel='debug'
        logger.add(winston.transports.Console,
                   {colorize: true
                   ,timestamp: true
                   ,level: loglevel
                   ,label: label
                   });
        break
        default:
        logger.add(winston.transports.Console,
                   {colorize: true
                   ,timestamp: true
                   ,level: loglevel
                   ,label: label
                   });
        break
        // make loglevels consistent

    }
    logger.setLevels(winston.config.syslog.levels);
    return logger
}

module.exports=get_logger
