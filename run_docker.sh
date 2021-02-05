#!/bin/bash

# bash wrappers for docker run commands
# should work on linux, perhaps on OSX


#
# Environment vars
#


# # useful for connecting GUI to container
# SOCK=/tmp/.X11-unix
# XAUTH=/tmp/.docker.xauth
# xauth nlist $DISPLAY | sed -e 's/^..../ffff/' | xauth -f $XAUTH nmerge -
# chmod 755 $XAUTH

#
# Helper Functions
#
dcleanup(){
	local containers
	mapfile -t containers < <(docker ps -aq 2>/dev/null)
	docker rm "${containers[@]}" 2>/dev/null
	local volumes
	mapfile -t volumes < <(docker ps --filter status=exited -q 2>/dev/null)
	docker rm -v "${volumes[@]}" 2>/dev/null
	local images
	mapfile -t images < <(docker images --filter dangling=true -q 2>/dev/null)
	docker rmi "${images[@]}" 2>/dev/null
}
del_stopped(){
	local name=$1
	local state
	state=$(docker inspect --format "{{.State.Running}}" "$name" 2>/dev/null)

	if [[ "$state" == "false" ]]; then
		docker rm "$name"
	fi
}
relies_on(){
	for container in "$@"; do
		local state
		state=$(docker inspect --format "{{.State.Running}}" "$container" 2>/dev/null)

		if [[ "$state" == "false" ]] || [[ "$state" == "" ]]; then
			echo "$container is not running, starting it for you."
			$container
		fi
	done
}

relies_on_network(){
    for network in "$@"; do
        local state
        state=$(docker network inspect --format "{{.Created}}" "$network" 2>/dev/null)

        if [[ "$state" == "false" ]] || [[ "$state" == "" ]]; then
            echo "$network is not up, starting it for you."
            $network
        fi
    done
}

cas_nw(){
    # create the network for communicating
    docker network create --driver bridge cas_nw
}

redis_nw(){
    docker network create --driver bridge redis_nw
}

cas(){
    del_stopped cas
    relies_on openldap
    relies_on_network cas_nw openldap_nw
    # docker run -d --rm \
    #        -v /etc/localtime:/etc/localtime:ro \
    #        --network=cas_nw \
    #        --name="cas"  jmarca/cas
    docker create --rm  \
           -v /etc/localtime:/etc/localtime:ro \
           --network cas_nw \
           --name cas jmarca/cas:6.2.0-SNAPSHOT
    docker network connect openldap_nw cas
    # copy in keystore for server
    docker cp ${PWD}/test/fixtures/keys/keystore_tests/thekeystore cas:/etc/cas/thekeystore
    # copy cer for server
    docker cp ${PWD}/test/fixtures/keys/keystore_tests/cas.cer cas:/etc/cas/cas.cer
    # copy in my configuration
    docker cp ${PWD}/test/fixtures/cas/cas.properties cas:/etc/cas/config/cas.properties
    # start the container
    docker start cas

    # if you want to follow along what cas is doing, then do
    # docker attach cas

}

redis(){
    del_stopped redis
    relies_on_network redis_nw
    docker run -d --rm \
           -v /etc/localtime:/etc/localtime:ro \
           --network=redis_nw \
           --name="redis" redis:alpine
}

make_cas_node_tests_docker(){
    docker build  -t jmarca/cas_node_tests .
}

openldap_nw(){
    docker network create --driver bridge openldap_nw
}

lam(){
    relies_on_network openldap_nw
    relies_on openldap
    docker run -p 8080:80 -it \
           -e LDAP_DOMAIN="activimetrics.com" \
           --env LDAP_SERVER=ldap://openldap:389 \
           --network openldap_nw \
           --name lam \
           ldapaccountmanager/lam

    # docker run --rm -it \
    #        --network openldap_nw \
    #        --env LAM_SKIP_PRECONFIGURE=false \
    #        -e LDAP_DOMAIN="activimetrics.com" \
    #        --env LDAP_SERVER=ldap://openldap:389 \
    #        -e LDAP_ADMIN_PASSWORD="grobblefruit" \
    #        --env LAM_LANG=en_US \
    #        --env LAM_PASSWORD=lam \
    #        ldapaccountmanager/lam:current
}

openldap(){
    del_stopped openldap
    relies_on_network openldap_nw
    docker run --rm -d \
           --network openldap_nw \
           --name openldap \
           -e LDAP_DOMAIN="activimetrics.com" \
           -e LDAP_ORGANIZATION="Activimetrics LLC" \
           -e LDAP_ADMIN_PASSWORD="grobblefruit" \
           --volume ${PWD}/test/ldap_restore/ldif_dump.ldif:/container/service/slapd/assets/config/bootstrap/ldif/50-bootstrap.ldif \
           osixia/openldap  --loglevel debug --copy-service


    # mwaeckerlin/openldap
    # docker cp  ${PWD}/test/ldap_restore/test-data.ldif openldap:/var/restore/test-data.ldif
    # docker restart -t 0 openldap

}


cas_node_test(){
    docker stop cas_node_tests
    del_stopped "cas_node_tests"
    relies_on_network cas_nw redis_nw
    relies_on cas redis
    docker create --rm -it -u node -v ${PWD}:/usr/src/dev  -w /usr/src/dev  --network redis_nw --name cas_node_tests jmarca/cas_node_tests bash
    docker network connect cas_nw cas_node_tests
    docker start cas_node_tests
    docker attach cas_node_tests
}
