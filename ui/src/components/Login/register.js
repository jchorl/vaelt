import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { generateKeyPair } from '../../crypto';
import { register } from '../../actions/register';
import LoadingSpinner from '../LoadingSpinner';

class Register extends Component {
    static propTypes = {
        register: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
            error: ImmutablePropTypes.contains({
                message: PropTypes.string.isRequired,
            }),
        }),
        registerUser: PropTypes.func.isRequired,
    }

    constructor() {
        super();

        this.state = {
            email: "",
            password: "",
            loading: false,
        }
    }

    componentWillReceiveProps(nextProps) {
        // if there is an error or success, loading is done
        if ((!this.props.register.has('error') && nextProps.register.has('error'))
            || (!this.props.register.has('receivedAt') && nextProps.register.has('receivedAt'))) {
            this.setState({ loading: false });
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

    submit = async e => {
        e.preventDefault();

        this.setState({ loading: true });

        const { email, password } = this.state;
        const { registerUser } = this.props;

        // generate a keypair
        const key = await generateKeyPair(email, password);
        const keys = [{
            armoredKey: key.privateKeyArmored,
            type: 'private',
            name: 'Password',
            device: 'password',
        }, {
            armoredKey: key.publicKeyArmored,
            type: 'public',
            name: 'Password',
            device: 'password',
        }];

        registerUser(email, password, keys);
    }

    render() {
        const { register } = this.props;
        const { email, password, loading } = this.state;

        return !loading ? (
            <form>
                { register.has('receivedAt') ?
                (
                <div className="verificationText">We've sent you a verification email. Please click that link to activate your account.</div>
                ) : (
                <div className="inputContainer">
                    <input type="text" name="email" value={ email } onChange={ this.handleInputChange } placeholder="Email" />
                    <input type="password" name="password" value={ password } onChange={ this.handleInputChange } placeholder="Password" />
                    { register.has('error') ? (
                    <div className="errorText">
                        { register.getIn(['error', 'message']) }
                    </div>
                    ) : null }
                    <button type="submit" onClick={ this.submit } className="submitButton">{ 'Register' }</button>
                </div>
                ) }
            </form>
            ) : <LoadingSpinner />;
    }
}

export default connect(
    state => ({ register: state.register }),
    dispatch => ({
        registerUser: (email, password, keys) => dispatch(register(email, password, keys)),
    }),
)(Register);
