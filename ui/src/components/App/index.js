import React, { Component } from "react";
import { Route } from "react-router-dom";
import Nav from "./nav";
import UnverifiedBar from "./unverifiedBar";
import Splash from "./splash";
import Dashboard from "../Dashboard";
import "./App.css";

export default class App extends Component {
  render() {
    return (
      <div className="app">
        <Nav />
        <UnverifiedBar />
        <Route exact path="/" component={Splash} />
        <Route path="/dashboard" component={Dashboard} />
      </div>
    );
  }
}
