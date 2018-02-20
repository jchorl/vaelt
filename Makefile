UID=$(shell id -u)
GID=$(shell id -g)

deploy:
	docker container run --rm -it \
		-v $(PWD):/root/go/src/github.com/jchorl/passwords \
		-w /root/go/src/github.com/jchorl/passwords \
		jac/gclouddev \
		sh -c "go get ./... && python /usr/lib/google-cloud-sdk/platform/google_appengine/appcfg.py -A passwordsjc --noauth_local_webserver update ."

devserverbuild:
	docker build -t jchorl/gclouddev -f devserver.Dockerfile .

devserve:
	docker container run --rm -it \
		-v gotmp:/root/go/src \
		-v $(PWD):/root/go/src/github.com/jchorl/passwords \
		-w /root/go/src/github.com/jchorl/passwords \
		--net=host \
		jchorl/gclouddev

ui-dev:
	docker container run --rm -it \
		-v $(PWD)/ui:/usr/src/app \
		-w /usr/src/app \
		-u $(UID):$(GID) \
		--net=host \
		node \
		sh -c "yarn install \
		&& cp node_modules/openpgp/dist/* public/ \
		&& HTTPS=true yarn start" # openpgpjs loads file over the network

node:
	docker container run --rm -it \
		-u $(UID):$(GID) \
		-v $(PWD):/usr/src/app \
		-w /usr/src/app \
		node \
		bash
