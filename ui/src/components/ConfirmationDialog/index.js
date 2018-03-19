import React, { Component } from "react";
import PropTypes from "prop-types";
import "./confirmationDialog.css";

export default class ConfirmationDialog extends Component {
  static propTypes = {
    message: PropTypes.string.isRequired,
    buttonText: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
  };

  cancel = () => {
    this.props.close();
  };

  render() {
    const { message, buttonText, onSuccess } = this.props;

    return (
      <div className="confirmationDialog">
        <div className="body">
          <div className="header">
            Are you absolutely sure?
            <i className="fa fa-times closeIcon" onClick={this.cancel} />
          </div>
          <div className="text">{message}</div>
          <div className="buttons">
            <button className="nobackground" onClick={this.cancel}>
              Cancel
            </button>
            <button className="danger filled" onClick={onSuccess}>
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
