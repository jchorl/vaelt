import React, { Component } from "react";
import PropTypes from "prop-types";
import "./helpPopup.css";

export default class HelpPopup extends Component {
  static propTypes = {
    message: PropTypes.string.isRequired,
  };

  render() {
    return (
      <i className="fa fa-info-circle helpPopup">
        <div className="message">{this.props.message}</div>
      </i>
    );
  }
}
