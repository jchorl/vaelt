import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import './nav.css';

class Nav extends Component {
    static propTypes = {
        user: PropTypes.shape({
            email: PropTypes.string.isRequired,
        })
    }

    logout = () => {
        const { history } = this.props;

        fetch("/api/logout", {
            method: 'GET',
            credentials: 'same-origin',
        })
        .then(resp => {
            if (resp.ok) {
                history.go("/");
            } else {
                resp.text().then(body => {
                    alert('Logout failed: ' + body);
                });
            }
        })
        .catch(err => {
            console.error('Logout failed');
            console.error(err);
            alert('Logout failed');
        });
    }

    render() {
        const { user } = this.props;

        return (
            <div className="nav">
                <div className="logo">
                    Vælt
                </div>
                <div>
                    { !!user ? (
                    <div>
                        <span>Hi, { user.email }!</span>
                        <button className="logoutButton" onClick={ this.logout }>Logout</button>
                    </div>
                    ) : null }
                </div>
            </div>
            );
    }
}

export default withRouter(Nav);
