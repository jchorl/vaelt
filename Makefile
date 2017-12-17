UID=$(shell id -u)
GID=$(shell id -g)

deploy:
	docker container run --rm -it \
		-v $(PWD):/root/go/src/github.com/jchorl/passwords \
		-w /root/go/src/github.com/jchorl/passwords \
		jac/gclouddev \
		sh -c "go get ./... && python /usr/lib/google-cloud-sdk/platform/google_appengine/appcfg.py -A passwordsjc --noauth_local_webserver update ."

devserverbuild:
	docker build -t jac/gclouddev -f devserver.Dockerfile .

devserve:
	docker container run --rm -it \
		-v $(PWD):/root/go/src/github.com/jchorl/passwords \
		-w /root/go/src/github.com/jchorl/passwords \
		-p 8080:8080 \
		-p 8000:8000 \
		jac/gclouddev

ui-dev:
	docker container run --rm -it \
		-v $(PWD)/ui:/usr/src/app \
		-w /usr/src/app \
		-u $(UID):$(GID) \
		-p 3000:3000 \
		node \
		yarn start

node:
	docker container run --rm -it \
		-u $(UID):$(GID) \
		-v $(PWD):/usr/src/app \
		-w /usr/src/app \
		node \
		bash
