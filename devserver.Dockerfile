FROM google/cloud-sdk:183.0.0

RUN curl -L -o go1.8.1.linux-amd64.tar.gz https://redirector.gvt1.com/edgedl/go/go1.8.1.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.8.1.linux-amd64.tar.gz && \
    rm -rf go1.8.1.linux-amd64.tar.gz
ENV PATH="${PATH}:/usr/local/go/bin"
ENV GOPATH="/root/go"

# fetch the deps first and then serve
CMD sh -c "grep -R --include=\*.go '\"github.com.*\"\|\"golang.org.*\"\|\"google.golang.org.*\"' * | awk '{print \$2}' | sort | uniq | xargs go get; dev_appserver.py --host 0.0.0.0 ."
