import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { login } from '../../actions/login';

class Login extends Component {
    static propTypes = {
        login: ImmutablePropTypes.contains({
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

    handleInputChange = event => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value,
        });
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
                <input type="text" name="email" value={ email } onChange={ this.handleInputChange } placeholder="Email" />
                <input type="password" name="password" value={ password } onChange={ this.handleInputChange } placeholder="Password" />
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

export default connect(
    state => ({ login: state.login }),
    dispatch => ({
        loginUser: (email, password) => dispatch(login(email, password)),
    }),
)(Login);
