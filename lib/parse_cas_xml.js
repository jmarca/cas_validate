var xmlstring = '\n\n<cas:serviceResponse xmlns:cas=\'http://www.yale.edu/tp/cas\'>\n\t<cas:authenticationSuccess>\n\t\t<cas:user>jmarca</cas:user>\n   \n\n\n<!-- Begin Ldap Attributes -->\n  \n  <cas:attributes>\n   \n  </cas:attributes>\n  \n<!-- End Ldap Attributes -->\n\t</cas:authenticationSuccess>\n</cas:serviceResponse>\n'

var xmlbadticketstring='<cas:serviceResponse xmlns:cas=\'http://www.yale.edu/tp/cas\'>\n\t<cas:authenticationFailure code=\'INVALID_TICKET\'>\n\t\tticket &#039;diediedie&#039; not recognized\n\t</cas:authenticationFailure>\n</cas:serviceResponse>'

var libxmljs = require('libxmljs')

var saxparser = new libxmljs.SaxParser()
var usercharhandler=function(chars){
    console.log({'chars':chars})
    //req.session.name = user.text();
}
saxparser.on('startElementNS',function(elem, attrs, prefix, uri, namespaces) {
    console.log({'elem':elem
                ,'attrs':attrs
                ,'uri':uri
                ,'ns':namespaces})
    if(elem==='user'){
        console.log('user!')
        // valid user
        saxparser.on('characters',charhandler)
    }
});
saxparser.on('endElementNS',function(elem, attrs, prefix, uri, namespaces) {

    if(elem==='user'){
        console.log('turn off chars handler')
        // valid user
        saxparser.removeListener('characters',charhandler)
    }
})

saxparser.parseString(xmlstring)

saxparser.parseString(xmlbadticketstring)