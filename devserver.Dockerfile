FROM google/cloud-sdk:178.0.0

RUN curl -L -o go1.9.2.linux-amd64.tar.gz https://redirector.gvt1.com/edgedl/go/go1.9.2.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.9.2.linux-amd64.tar.gz && \
    rm -rf go1.9.2.linux-amd64.tar.gz
ENV PATH="${PATH}:/usr/local/go/bin"
ENV GOPATH="/root/go"

CMD sh -c "go get ./... && dev_appserver.py --host 0.0.0.0 ."
