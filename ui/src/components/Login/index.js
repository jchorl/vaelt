import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Login from './login';
import Register from './register';
import './loginRegister.css';

class LoginRegister extends Component {
    static propTypes = {
        history: PropTypes.shape({
            push: PropTypes.func.isRequired,
        }).isRequired,
        login: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
        }),
        user: ImmutablePropTypes.contains({
            email: PropTypes.string,
            receivedAt: PropTypes.number,
        }),
    }

    constructor() {
        super();

        this.state = {
            isRegister: false,
        }
    }

    componentWillReceiveProps(nextProps) {
        // redirect needs to be here, because the child login component gets deleted
        if (nextProps.login.has('receivedAt')) {
            this.props.history.push('/dashboard');
        }
    }

    goToDashboard = () => {
        this.props.history.push('/dashboard');
    }

    loginMode = () => {
        this.setState({ isRegister: false });
    }

    registerMode = () => {
        this.setState({ isRegister: true });
    }

    render() {
        const { isRegister } = this.state;
        const { user } = this.props;
        return (
            <div className="loginRegister whiteContainer">
                {
                !user.has('receivedAt')
                ? (
                <div>
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
                ) : (
                <div className="welcomeBack">
                    <div>
                        Welcome back,
                    </div>
                    <div>
                        { user.getIn(['user', 'email']) }
                    </div>
                    <div className="goToDashboardButtonWrapper">
                        <button onClick={ this.goToDashboard }>Go to dashboard</button>
                    </div>
                </div>
                )
                }
            </div>
            );
    }
}

export default withRouter(connect(
    state => ({
        login: state.login,
        user: state.user,
    }),
)(LoginRegister));
