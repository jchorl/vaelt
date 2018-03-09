import React, { Component } from 'react';
import U2fRegistrations from './u2fRegistrations';
import './account.css';

export default class Account extends Component {
    render() {
        return (
            <div className="account">
                <div className="accountContainer whiteContainer">
                    <U2fRegistrations />
                </div>
            </div>
            );
    }
}
