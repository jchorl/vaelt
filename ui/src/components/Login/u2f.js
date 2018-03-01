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

export default class SignU2F extends Component {
    constructor() {
        super();

        this.state = {
            email: "",
        }
    }

    handleEmailChange = event => {
        this.setState({email: event.target.value});
    }

    u2fSigned = resp => {
        console.log(resp);
        if (checkError(resp)) {
            return;
        }

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/u2f/sign", {
            credentials: 'same-origin',
            method: 'POST',
            body: JSON.stringify(resp),
            headers,
        })
        .then(resp => console.log(resp))
        .catch(err => console.error(err));
    }

    fetchChallenge = () => {
        let headers = new Headers();
        headers.append('Accept', 'application/json');
        headers.append('Authorization', 'Basic ' + btoa(this.state.email + ":"));
        fetch("/api/u2f/sign", {
            credentials: 'same-origin',
            headers,
        })
        .then(resp => resp.json())
        .then(req => {
            u2f.sign(req.appId, req.challenge, req.registeredKeys, this.u2fSigned, 30);
            console.log('tap the yubikey');
        })
        .catch(err => console.error(err));
    }

    render() {
        return (
            <div>
                <div>
                    Email: <input type="text" value={ this.state.email } onChange={ this.handleEmailChange } />
                </div>
                <div>
                    <button onClick={ this.fetchChallenge }>Sign U2F</button>
                </div>
            </div>
            );
    }
}
