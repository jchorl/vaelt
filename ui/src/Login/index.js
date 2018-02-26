import React, { Component } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import './loginRegister.css';

class LoginRegister extends Component {
    static propTypes = {
        history: PropTypes.object.isRequired,
    }

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

    submit = () => {
        const { email, password, isRegister } = this.state;

        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(email + ":" + password));
        if (isRegister) {
            fetch("/api/users", {
                method: 'POST',
                credentials: 'same-origin',
                headers: headers,
            })
            .then(resp => {
                if (resp.ok) {
                    this.setState({ registrationSuccess: true });
                } else {
                    resp.text().then(body => {
                        try {
                            let parsed = JSON.parse(body);
                            this.setState({ errorText: parsed.message })
                        } catch (e) {
                            this.setState({ errorText: body })
                        }
                    });
                }
            })
            .catch(err => {
                this.setState({ errorText: err.message || err.name });
            });
        } else {
            fetch("/api/users/login", {
                method: 'POST',
                credentials: 'same-origin',
                headers: headers,
            })
            .then(resp => {
                if (resp.ok) {
                    this.props.history.push('/dashboard');
                } else {
                    resp.text().then(body => {
                        try {
                            let parsed = JSON.parse(body);
                            this.setState({ errorText: parsed.message })
                        } catch (e) {
                            this.setState({ errorText: body })
                        }
                    });
                }
            })
            .catch(err => {
                this.setState({ errorText: err.message || err.name });
            });
        }
    }

    render() {
        const { email, password, isRegister, errorText, registrationSuccess } = this.state;
        return (
        <div className="loginRegister">
            <div className="toggles">
                <div className={ classNames("toggle", {"active": !isRegister}) } onClick={ this.loginMode }>Login</div>
                <div className={ classNames("toggle", {"active": isRegister}) } onClick={ this.registerMode }>Register</div>
            </div>
            { registrationSuccess ?
            (
            <div className="verificationText">We've sent you a verification email. Please click that link to activate your account.</div>
            ) : (
            <div className="inputContainer">
                <input type="text" value={ email } onChange={ this.handleEmailChange } placeholder="Email" />
                <input type="password" value={ password } onChange={ this.handlePasswordChange } placeholder="Password" />
                { !!errorText ? (
                <div className="errorText">
                    { errorText }
                </div>
                ) : null }
                <button type="submit" onClick={ this.submit } className="submitButton">{ isRegister ? 'Register' : 'Login' }</button>
            </div>
            ) }
        </div>
        );
    }
}

export default withRouter(LoginRegister);
