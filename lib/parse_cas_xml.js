var xmlstring = '\n\n<cas:serviceResponse xmlns:cas=\'http://www.yale.edu/tp/cas\'>\n\t<cas:authenticationSuccess>\n\t\t<cas:user>jmarca</cas:user>\n   \n\n\n<!-- Begin Ldap Attributes -->\n  \n  <cas:attributes>\n   \n  </cas:attributes>\n  \n<!-- End Ldap Attributes -->\n\t</cas:authenticationSuccess>\n</cas:serviceResponse>\n'

var xmlbadticketstring='<cas:serviceResponse xmlns:cas=\'http://www.yale.edu/tp/cas\'>\n\t<cas:authenticationFailure code=\'INVALID_TICKET\'>\n\t\tticket &#039;diediedie&#039; not recognized\n\t</cas:authenticationFailure>\n</cas:serviceResponse>'


var xmlattrs = '\n\n<cas:serviceResponse xmlns:cas=\'http://www.yale.edu/tp/cas\'>\n\t<cas:authenticationSuccess>\n\t\t<cas:user>jmarca</cas:user>\n   \n    \n     <mail>jmarca@translab.its.uci.edu</mail>\n    \n     <sn>Marca</sn>\n    \n     <cn>James Marca</cn>\n    \n     <givenName>James</givenName>\n    \n     <groups>[cn=admin,ou=groups,dc=ctmlabs,dc=org, cn=caltrans_d12_tmc,ou=groups,dc=ctmlabs,dc=org, cn=author,ou=groups,dc=ctmlabs,dc=org, cn=ctmlabs_staff,ou=groups,dc=ctmlabs,dc=org]</groups>\n    \n   \n\n\n<!-- Begin Ldap Attributes -->\n  \n  <cas:attributes>\n   \n    \n     <cas:mail>jmarca@translab.its.uci.edu</cas:mail>\n    \n     <cas:sn>Marca</cas:sn>\n    \n     <cas:cn>James Marca</cas:cn>\n    \n     <cas:givenName>James</cas:givenName>\n    \n     <cas:groups>[cn=admin,ou=groups,dc=ctmlabs,dc=org, cn=caltrans_d12_tmc,ou=groups,dc=ctmlabs,dc=org, cn=author,ou=groups,dc=ctmlabs,dc=org, cn=ctmlabs_staff,ou=groups,dc=ctmlabs,dc=org]</cas:groups>\n    \n   \n  </cas:attributes>\n  \n<!-- End Ldap Attributes -->\n\t</cas:authenticationSuccess>\n</cas:serviceResponse>\n'

var libxmljs = require('libxmljs2')
var saxparser
var usercharhandler=function(chars){
    console.log({'userchars':chars})
    //req.session.name = user.text();
}
var attributes={}
var attrcharhandler=function(attrname){
    return function(chars){
        attributes[attrname]=chars
        console.log('capturing '+attrname+' '+chars)
    }
}
var attrhandler=function(e,a,p,u,n){
    console.log({'attrhandler':{'e':e,'u':u}})
    saxparser.once('characters',attrcharhandler(e))
}
function startHandler(elem, attrs, prefix, uri, namespaces) {
    console.log({'elem':elem
                ,'attrs':attrs
                ,'uri':uri
                ,'ns':namespaces})
    if(elem==='user'){
        console.log('user!')
        // valid user
        saxparser.on('characters',usercharhandler)
    }
    if(elem==='attributes'){
        console.log('attributes!')
        // valid user
        saxparser.on('startElementNS',attrhandler)
    }
}
function endHandler(elem, attrs, prefix, uri, namespaces) {

    if(elem==='user'){
        console.log('turn off chars handler')
        // valid user
        saxparser.removeListener('characters',usercharhandler)
    }
    if(elem==='attributes'){
        console.log('turn off attributes!')
        // valid user
        saxparser.removeListener('startElementNS',attrhandler)
    }
}

var async = require('async')
saxparser = new libxmljs.SaxParser()
saxparser.on('startElementNS',startHandler);
saxparser.on('endElementNS',endHandler)

async.forEach([xmlstring,xmlbadticketstring,xmlattrs]
          ,function(str,cb){
               console.log('next string')
               saxparser.removeAllListeners('endDocument')
               .on('endDocument',cb)
               saxparser.parseString(str)
           }
          ,function(e){
               console.log('done')
               if(attributes) console.log(attributes)
           });
