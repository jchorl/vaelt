import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import RegisterU2F from '../U2F/register';
import { deleteRegistration, fetchRegistrationsIfNeeded } from '../../actions/u2f';
import './account.css';

class Account extends Component {
    static propTypes = {
        deleteRegistration: PropTypes.func.isRequired,
        fetchRegistrationsIfNeeded: PropTypes.func.isRequired,
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

    componentWillMount() {
        this.props.fetchRegistrationsIfNeeded();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.user.hasIn(['user', 'u2fEnforced']) &&
            this.props.user.getIn(['user', 'u2fEnforced']) !== nextProps.user.getIn(['user', 'u2fEnforced'])) {
            this.setState({ u2fEnforced: nextProps.user.getIn(['user', 'u2fEnforced']) });
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

    deleteU2f = id => () => {
        const { deleteRegistration } = this.props;
        deleteRegistration(id);
    }

    render() {
        const { u2fEnforced } = this.state;
        const { registrations } = this.props;

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
                    {
                    u2fEnforced
                    ? (
                    <div className="u2fRegistrations">
                        {
                        !registrations.get('registrations').isEmpty()
                        ? (
                        <div>
                            <div>Registered Devices</div>
                            <div className="registrationsTable">
                                {
                                registrations.get('registrations').map(r => (
                                <div className="u2fRegistration" key={ r.get('id') }>
                                    <div>{ r.get('createdAt').toLocaleDateString() }</div>
                                    <button className="danger" onClick={ this.deleteU2f(r.get('id')) } >Remove</button>
                                </div>
                                ))
                                }
                            </div>
                        </div>
                        ) : null
                        }
                        <div>Register New Device</div>
                        <RegisterU2F />
                    </div>
                    )
                    : null }
                </div>
            </div>
            );
    }
}

export default connect(
    state => ({
        registrations: state.u2f.get('registrations'),
        user: state.user,
    }),
    dispatch => ({
        deleteRegistration: id => dispatch(deleteRegistration(id)),
        fetchRegistrationsIfNeeded: () => dispatch(fetchRegistrationsIfNeeded()),
    }),
)(Account);
