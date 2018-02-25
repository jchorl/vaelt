import React, { Component } from 'react';
import classNames from 'classnames';
import './loginRegister.css';

export default class LoginRegister extends Component {
    constructor() {
        super();

        this.state = {
            email: "",
            password: "",
            isRegister: false,
        }
    }

    handleEmailChange = event => {
        this.setState({ email: event.target.value });
    }

    handlePasswordChange = event => {
        this.setState({ password: event.target.value });
    }

    loginMode = () => {
        this.setState({ isRegister: false });
    }

    registerMode = () => {
        this.setState({ isRegister: true });
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
                console.log('should log in');
            }
        })
        .catch(err => console.err(err));
    }

    render() {
        return (
        <div className="loginRegister">
            <div className="toggles">
                <div className={ classNames("toggle", {"active": !this.state.isRegister}) } onClick={ this.loginMode }>Login</div>
                <div className={ classNames("toggle", {"active": this.state.isRegister}) } onClick={ this.registerMode }>Register</div>
            </div>
            <input type="text" value={ this.state.email } onChange={ this.handleEmailChange } placeholder="Email" />
            <input type="password" value={ this.state.password } onChange={ this.handlePasswordChange } placeholder="Password" />
            <button type="submit" onClick={ this.register } className="submitButton">{ this.state.isRegister ? 'Register' : 'Login' }</button>
        </div>
        );
    }
}
