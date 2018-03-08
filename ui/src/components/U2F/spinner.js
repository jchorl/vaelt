import React, { Component } from 'react';
import './spinner.css';

export default class Spinner extends Component {
    render() {
        return (
            <div className="spinner">
                <div className="spinning pie"></div>
                <div className="fillBg"></div>
                <div className="fill"></div>
                <div className="fillOverlay"></div>
                <div className="mask"></div>
            </div>
        )
    }
}
