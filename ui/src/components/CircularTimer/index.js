import React, { Component } from 'react';
import './circularTimer.css';

export default class CircularTimer extends Component {
    render() {
        return (
            <div className="circularTimer">
                <div className="spinning pie"></div>
                <div className="fillBg"></div>
                <div className="fill"></div>
                <div className="fillOverlay"></div>
                <div className="mask"></div>
            </div>
        )
    }
}
