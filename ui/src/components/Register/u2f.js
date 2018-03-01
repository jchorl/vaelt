/* global u2f */
import React, { Component } from 'react';

// taken straight from https://github.com/tstranex/u2f/blob/master/u2fdemo/main.go
function checkError(resp) {
    if (!('errorCode' in resp)) {
        return false;
    }
    if (resp.errorCode === u2f.ErrorCodes['OK']) {
        return false;
    }
    let msg = 'U2F error code ' + resp.errorCode;
    for (let name in u2f.ErrorCodes) {
        if (u2f.ErrorCodes[name] === resp.errorCode) {
            msg += ' (' + name + ')';
        }
    }
    if (resp.errorMessage) {
        msg += ': ' + resp.errorMessage;
    }
    console.log(msg);
    return true;
}

export default class RegisterU2F extends Component {
    u2fRegistered = resp => {
        console.log(resp);
        if (checkError(resp)) {
            return;
        }

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/u2f/register", {
            credentials: 'same-origin',
            method: 'POST',
            body: JSON.stringify(resp),
            headers,
        })
        .then(resp => console.log(resp))
        .catch(err => console.err(err));
    }

    fetchChallenge = () => {
        let headers = new Headers();
        headers.append('Accept', 'application/json');
        fetch("/api/u2f/register", {
            credentials: 'same-origin',
            headers,
        })
        .then(resp => resp.json())
        .then(req => {
            u2f.register(req.appId, req.registerRequests, req.registeredKeys, this.u2fRegistered, 30);
            console.log('tap the yubikey');
        })
        .catch(err => console.err(err));
    }

    render() {
        return (
            <button onClick={ this.fetchChallenge }>Register U2F</button>
            );
    }
}
