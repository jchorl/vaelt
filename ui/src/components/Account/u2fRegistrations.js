import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { deleteRegistration, fetchRegistrationsIfNeeded } from '../../actions/u2f';
import RegisterU2F from '../U2F/register';

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
    }

    componentWillMount() {
        this.props.fetchRegistrationsIfNeeded();
    }

    deleteU2f = id => () => {
        const { deleteRegistration } = this.props;
        deleteRegistration(id);
    }

    render() {
        const { registrations } = this.props;

        return (
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
            );
    }
}

export default connect(
    state => ({
        registrations: state.u2f.get('registrations'),
    }),
    dispatch => ({
        deleteRegistration: id => dispatch(deleteRegistration(id)),
        fetchRegistrationsIfNeeded: () => dispatch(fetchRegistrationsIfNeeded()),
    }),
)(U2fRegistrations);
