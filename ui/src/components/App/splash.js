import React, { Component } from "react";
import LoginRegister from "../Login";
import "./splash.css";

export default class Splash extends Component {
  render() {
    return (
      <div className="splash">
        <div className="blurb">
          <h2 className="headline">
            A password manager that is flexible. And secure.
          </h2>
          <div className="blurbText">
            Ensure that you, and those you trust, can always access your
            passwords as easily and securely as possible.
          </div>
        </div>
        <div className="splashLogin">
          <LoginRegister />
        </div>
        <div className="lock">
          <div className="lockHump">
            <div className="lockHumpCutout" />
          </div>
          <div className="lockSquare">
            <div className="lockKeyCircle" />
            <div className="lockKeyTrapezoid" />
          </div>
        </div>
        <div className="curveone">
          <div className="curvetwo" />
          <div className="curvethree" />
        </div>
      </div>
    );
  }
}
