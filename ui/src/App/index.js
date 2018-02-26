import React, { Component } from 'react';
import { Route } from 'react-router-dom'
import Nav from './nav';
import Splash from './splash';
import Dashboard from '../Dashboard';
import './App.css';

export default class App extends Component {
    render() {
        return (
            <div className="app">
                <Nav />
                <Route exact path="/" component={Splash}/>
                <Route path="/dashboard" component={Dashboard}/>
            </div>
            );
    }
}
