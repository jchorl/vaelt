import React, { Component } from 'react';

export default class Logout extends Component {
    logout = () => {
        fetch("/api/logout", {
            credentials: 'same-origin',
        })
        .then(resp => console.log(resp))
        .catch(err => console.err(err));
    }

    render() {
        return (
            <button onClick={ this.logout }>Logout</button>
            );
    }
}
