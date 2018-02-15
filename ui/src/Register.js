import React, { Component } from 'react';

export default class Register extends Component {
    constructor() {
        super();

        this.state = {
            email: "",
            password: "",
            registered: false,
        }
    }

    handleEmailChange = event => {
        this.setState({email: event.target.value});
    }

    handlePasswordChange = event => {
        this.setState({password: event.target.value});
    }

    register = () => {
        const { email, password } = this.state;

        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(email + ":" + password));
        fetch("/api/users", {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
        })
        .then(resp => {
            if (resp.ok) {
                this.setState({ registered: true });
            }
        })
        .catch(err => console.err(err));
    }

    render() {
        return !this.state.registered ? (
            <div>
                <div>Register:</div>
                <div>
                    Email: <input type="text" value={ this.state.email } onChange={ this.handleEmailChange } />
                </div>
                <div>
                    Password: <input type="password" value={ this.state.password } onChange={ this.handlePasswordChange } />
                </div>
                <button type="submit" onClick={ this.register }>Submit</button>
            </div>
            ) : null;
    }
}
