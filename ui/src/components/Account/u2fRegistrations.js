import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { deleteRegistration, fetchRegistrationsIfNeeded } from '../../actions/u2f';
import RegisterU2F from '../U2F/register';
import './u2fRegistrations.css';

class U2fRegistrations extends Component {
    static propTypes = {
        deleteRegistration: PropTypes.func.isRequired,
        fetchRegistrationsIfNeeded: PropTypes.func.isRequired,
        registrations: ImmutablePropTypes.contains({
            registrations: ImmutablePropTypes.listOf(
                ImmutablePropTypes.contains({
                    id: PropTypes.string.isRequired,
                    createdAt: PropTypes.instanceOf(Date).isRequired,
                }),
            ).isRequired,
        }).isRequired,
        u2fEnforced: PropTypes.bool,
    }

    constructor(props) {
        super(props);

        this.state = {
            u2fEnforced: props.u2fEnforced || false
        }
    }

    componentWillReceiveProps(nextProps) {
        // check if u2fEnforced has changed
        if (nextProps.u2fEnforced &&
            this.props.u2fEnforced !== nextProps.u2fEnforced) {
            this.setState({ u2fEnforced: nextProps.u2fEnforced });
        }
    }

    componentWillMount() {
        this.props.fetchRegistrationsIfNeeded();
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
        const { registrations } = this.props;
        const { u2fEnforced } = this.state;

        // TODO make the disable switch actually disable
        return (
            <div className="u2fRegistrations">
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
                <div className="greyContainer">
                    {
                    !registrations.get('registrations').isEmpty()
                    ? (
                    <div>
                        <div>Registered Devices</div>
                        <div className="table">
                            {
                            registrations.get('registrations').map(r => (
                            <div className="tableEntry" key={ r.get('id') }>
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
                ) : null
                }
            </div>
            );
    }
}

export default connect(
    state => ({
        registrations: state.u2f.get('registrations'),
        u2fEnforced: state.user.getIn(['user', 'u2fEnforced']),
    }),
    dispatch => ({
        deleteRegistration: id => dispatch(deleteRegistration(id)),
        fetchRegistrationsIfNeeded: () => dispatch(fetchRegistrationsIfNeeded()),
    }),
)(U2fRegistrations);
