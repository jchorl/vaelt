import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { connect } from "react-redux";
import { fetchUserIfNeeded, resendVerificationEmail } from "../../actions/user";
import "./unverifiedBar.css";

class UnverifiedBar extends Component {
  static propTypes = {
    fetchUserIfNeeded: PropTypes.func.isRequired,
    resendVerificationEmail: PropTypes.func.isRequired,
    user: ImmutablePropTypes.contains({
      verified: PropTypes.bool,
      resendVerificationSuccess: PropTypes.bool,
      receivedAt: PropTypes.number,
    }),
  };

  constructor(props) {
    super(props);
    this.state = {
      sent: false,
    };
  }

  render() {
    const { user, resendVerificationEmail } = this.props;
    return user.get("receivedAt") && !user.getIn(["user", "verified"]) ? (
      <div className="unverifiedBar">
        Your account is unverified. You will need to verify it before you can
        begin using it.
        {!user.has("resendVerificationSuccess") ? (
          <button className="resendButton" onClick={resendVerificationEmail}>
            Resend Verification Email
          </button>
        ) : user.get("resendVerificationSuccess") ? (
          <i className="fa fa-check-circle resendIcon" />
        ) : (
          <i className="fa fa-times-circle resendIcon" />
        )}
      </div>
    ) : null;
  }
}

export default connect(
  state => ({ user: state.user }),
  dispatch => ({
    fetchUserIfNeeded: () => dispatch(fetchUserIfNeeded()),
    resendVerificationEmail: () => dispatch(resendVerificationEmail()),
  })
)(UnverifiedBar);
