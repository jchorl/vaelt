import React, { Component } from "react";
import "./circularTimer.css";

export default class CircularTimer extends Component {
  render() {
    return (
      <div className="circularTimer">
        <div className="spinning pie" />
        <div className="fillBg" />
        <div className="fill" />
        <div className="fillOverlay" />
        <div className="mask" />
      </div>
    );
  }
}
