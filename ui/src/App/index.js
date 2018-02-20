import React, { Component } from 'react';
import Register from '../Register';
import RegisterU2F from '../Register/u2f';
import Logout from '../Login/logout';
import SignU2F from '../Login/u2f';
import './App.css';

export default class App extends Component {
    render() {
        return (
            <div className="App">
                <Register />
                <RegisterU2F />
                <Logout />
                <SignU2F />
            </div>
            );
    }
}
