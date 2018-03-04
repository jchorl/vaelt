import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { fetchUserIfNeeded } from '../../actions/user';

class Dashboard extends Component {
    static propTypes = {
        fetchUserIfNeeded: PropTypes.func.isRequired,
        history: PropTypes.shape({
            push: PropTypes.func.isRequired,
        }).isRequired,
        user: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
        }),
    }

    componentWillMount() {
        const {
            fetchUserIfNeeded,
        } = this.props;

        fetchUserIfNeeded();
    }

    componentWillReceiveProps(nextProps) {
        const { history } = this.props;

        if (nextProps.user.has('error')) {
            history.push("/");
        }
    }

    render() {
        return (
            <div className="dashboard">
                Dashboard
            </div>
            );
    }
}

export default withRouter(connect(
    state => ({
        user: state.user,
    }),
    dispatch => ({
        fetchUserIfNeeded: () => dispatch(fetchUserIfNeeded()),
    }),
)(Dashboard));
