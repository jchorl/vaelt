import React, { Component } from 'react';
import Nav from './nav';
import Splash from './splash';
import './App.css';

export default class App extends Component {
    render() {
        return (
            <div className="app">
                <Nav />
                <Splash />
            </div>
            );
    }
}
