import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import { connect } from 'react-redux';
import Login from './login';
import Register from './register';
import './loginRegister.css';

class LoginRegister extends Component {
    static propTypes = {
        user: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
        }),
    }

    constructor() {
        super();

        this.state = {
            isRegister: false,
        }
    }

    loginMode = () => {
        this.setState({ isRegister: false });
    }

    registerMode = () => {
        this.setState({ isRegister: true });
    }

    render() {
        const { isRegister } = this.state;
        // TODO display dashboard link if already logged in
        // use the user prop or get rid of it
        return (
            <div className="loginRegister">
                <div className="toggles">
                    <div className={ classNames("toggle", {"active": !isRegister}) } onClick={ this.loginMode }>Login</div>
                    <div className={ classNames("toggle", {"active": isRegister}) } onClick={ this.registerMode }>Register</div>
                </div>
                {
                isRegister
                ? <Register />
                : <Login />
                }
            </div>
            );
    }
}

export default connect(
    state => ({ user: state.user }),
)(LoginRegister);
