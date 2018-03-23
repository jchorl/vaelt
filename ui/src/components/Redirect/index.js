import React, { Component } from "react";
import "./redirect.css";

export default class Redirect extends Component {
  componentWillMount() {
    const { match: { params: { link } }, history } = this.props;
    setTimeout(() => {
      history.push(decodeURIComponent(link));
    }, 3 * 1000);
  }

  render() {
    return (
      <div className="redirectPage">
        <div className="whiteContainer">
          Success! Redirecting in 3 seconds...
        </div>
      </div>
    );
  }
}
