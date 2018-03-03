import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { login } from '../../actions/login';

class Login extends Component {
    static propTypes = {
        history: PropTypes.shape({
            push: PropTypes.func.isRequired,
        }).isRequired,
        login: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
            error: ImmutablePropTypes.contains({
                message: PropTypes.string.isRequired,
            }),
        }),
        loginUser: PropTypes.func.isRequired,
    }

    constructor() {
        super();

        this.state = {
            email: "",
            password: "",
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.login.has('receivedAt')) {
            this.props.history.push('/dashboard');
        }
    }

    handleEmailChange = event => {
        this.setState({ email: event.target.value });
    }

    handlePasswordChange = event => {
        this.setState({ password: event.target.value });
    }

    submit = e => {
        e.preventDefault();

        const { email, password } = this.state;
        const { loginUser } = this.props;

        loginUser(email, password);
    }

    render() {
        const { login } = this.props;
        const { email, password } = this.state;

        return (
            <form className="inputContainer">
                <input type="text" value={ email } onChange={ this.handleEmailChange } placeholder="Email" />
                <input type="password" value={ password } onChange={ this.handlePasswordChange } placeholder="Password" />
                { login.has('error') ? (
                <div className="errorText">
                    { login.getIn(['error', 'message']) }
                </div>
                ) : null }
                <button type="submit" onClick={ this.submit } className="submitButton">{ 'Login' }</button>
            </form>
        );
    }
}

export default withRouter(connect(
    state => ({ login: state.login }),
    dispatch => ({
        loginUser: (email, password) => dispatch(login(email, password)),
    }),
)(Login));
