import React, { Component } from "react";
import U2fRegistrations from "./u2fRegistrations";
import Keys from "./keys";
import HIBP from "./hibp";
import "./account.css";

export default class Account extends Component {
  render() {
    return (
      <div className="account">
        <div className="accountContainer whiteContainer">
          <Keys />
          <U2fRegistrations />
          <HIBP />
        </div>
      </div>
    );
  }
}
