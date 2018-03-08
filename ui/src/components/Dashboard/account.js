import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import RegisterU2F from '../U2F/register';
import './account.css';

class Account extends Component {
    static propTypes = {
        user: ImmutablePropTypes.contains({
            email: PropTypes.string,
            u2fEnforced: PropTypes.bool,
        }).isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            u2fEnforced: props.user.getIn(['user', 'u2fEnforced']) || false
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ u2fEnforced: nextProps.user.getIn(['user', 'u2fEnforced']) });
    }

    handleInputChange = event => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value,
        });
    }

    render() {
        const { u2fEnforced } = this.state;

        // TODO show enrolled devices
        return (
            <div className="account">
                <div className="accountContainer whiteContainer">
                    <h2>Two-Factor Auth</h2>
                    <div className="u2fToggle">
                        <div className="u2fEnabledText">Enabled:</div>
                        <div>
                            <input id="2faCheck" name="u2fEnforced" type="checkbox" checked={ u2fEnforced } onChange={ this.handleInputChange } /><label htmlFor="2faCheck" className="toggle"></label>
                        </div>
                    </div>
                    { u2fEnforced ? <RegisterU2F /> : null }
                </div>
            </div>
            );
    }
}

export default connect(state => ({ user: state.user }))(Account);
