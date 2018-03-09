import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { Route, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import { fetchUserIfNeeded } from '../../actions/user';
import Vault from './vault';
import Account from '../Account';
import './dashboard.css';

class Dashboard extends Component {
    static propTypes = {
        fetchUserIfNeeded: PropTypes.func.isRequired,
        history: PropTypes.shape({
            push: PropTypes.func.isRequired,
            replace: PropTypes.func.isRequired,
        }).isRequired,
        location: PropTypes.shape({
            pathname: PropTypes.string.isRequired,
        }).isRequired,
        match: PropTypes.shape({
            path: PropTypes.string.isRequired,
        }).isRequired,
        user: ImmutablePropTypes.contains({
            receivedAt: PropTypes.number,
        }),
    }

    componentWillMount() {
        const {
            fetchUserIfNeeded,
            match: { isExact },
            history,
        } = this.props;

        fetchUserIfNeeded();

        // if route is exactly /dashboard, redirect
        if (isExact) {
            history.replace('/dashboard/vault');
        }
    }

    componentWillReceiveProps(nextProps) {
        const { history } = this.props;

        // if the user cannot be fetched, just go home
        if (nextProps.user.has('error')) {
            history.push("/");
        }
    }

    render() {
        const { location: { pathname } } = this.props;

        return (
            <div className="dashboard">
                <div className="dashboardNav">
                    <Link to="vault" className={ classNames('navOption', { active: pathname === '/dashboard/vault' }) }>Vault</Link>
                    <Link to="account" className={ classNames('navOption', { active: pathname === '/dashboard/account' }) }>Account</Link>
                </div>
                <Route path="/dashboard/vault" component={ Vault } />
                <Route path="/dashboard/account" component={ Account } />
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
