FROM apereo/cas:v5.3.10

RUN rsync -av etc/cas /etc/. \
    && keytool \
        -genkeypair -alias cas \
        -keyalg RSA \
        -keypass changeit \
        -storepass changeit \
        -keystore /etc/cas/thekeystore \
	-dname "CN=cas.example.org,OU=Example,OU=Org,C=US"\
        -ext SAN="dns:example.org,dns:localhost,ip:cas" \
    && keytool -exportcert -alias cas -storepass changeit \
        -keystore /etc/cas/thekeystore -file /etc/cas/cas.cer \
    && echo 'cas cas.example.org' >> /etc/hosts
