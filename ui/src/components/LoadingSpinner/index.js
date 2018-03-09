import React, { Component } from 'react';
import './loadingSpinner.css';

export default class LoadingSpinner extends Component {
    render() {
        return (
            <div className="loadingSpinner">
                <div className="double-bounce1"></div>
                <div className="double-bounce2"></div>
            </div>
            );
    }
}
