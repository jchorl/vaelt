/* global u2f */
import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { checkError } from "./util";
import { fetchSignChallenge, fetchSignFinish } from "../../actions/u2f";
import CircularTimer from "../CircularTimer";
import "./u2f.css";

const NOT_STARTED = Symbol("NOT_STARTED");
const TAP_REQUIRED = Symbol("TAP_REQUIRED");
const TAP_EXPIRED = Symbol("TAP_EXPIRED");
const FAILED = Symbol("FAILED");
const SUCCEEDED = Symbol("SUCCEEDED");

class SignU2F extends Component {
  static propTypes = {
    fetchSignChallenge: PropTypes.func.isRequired,
    fetchSignFinish: PropTypes.func.isRequired,
    u2f: ImmutablePropTypes.contains({
      challenge: ImmutablePropTypes.contains({
        appId: PropTypes.string.isRequired,
        challenge: PropTypes.string.isRequired,
        registeredKeys: ImmutablePropTypes.list,
      }),
    }).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      state: NOT_STARTED,
    };
  }

  componentWillMount() {
    this.props.fetchSignChallenge();
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.u2f.has("challenge") &&
      this.props.u2f.get("challenge") !== nextProps.u2f.get("challenge")
    ) {
      const challenge = nextProps.u2f.get("challenge");
      this.challengeReceived(challenge);
    } else if (nextProps.u2f.has("error") && this.state.state !== FAILED) {
      this.setState({ state: FAILED });
    } else if (nextProps.u2f.has("complete")) {
      this.setState({ state: SUCCEEDED });
    }
  }

  challengeReceived = challenge => {
    u2f.sign(
      challenge.get("appId"),
      challenge.get("challenge"),
      challenge.get("registeredKeys"),
      this.responseReceived,
      30
    );
    this.setState({ state: TAP_REQUIRED });
  };

  responseReceived = resp => {
    if (checkError(resp)) {
      if (resp.errorCode === u2f.ErrorCodes.TIMEOUT) {
        this.setState({ state: TAP_EXPIRED });
      } else {
        this.setState({ state: FAILED });
      }
      return;
    }

    const { fetchSignFinish } = this.props;
    fetchSignFinish(resp);
  };

  render() {
    const { state } = this.state;
    const { fetchSignChallenge } = this.props;

    return (
      <div className="u2f login">
        {state === NOT_STARTED ? (
          <button onClick={fetchSignChallenge}>Fetching U2F...</button>
        ) : state === TAP_REQUIRED ? (
          <div className="tapStage">
            <div>Tap your U2F device</div>
            <CircularTimer />
          </div>
        ) : state === TAP_EXPIRED ? (
          <div className="horizontalCenter">
            <div>Time has expired</div>
            <button
              className="retryButton nobackground"
              onClick={fetchSignChallenge}
            >
              Try Again
            </button>
          </div>
        ) : state === FAILED ? (
          <div className="horizontalCenter">
            <div>Something went wrong :(</div>
            <button
              className="retryButton nobackground"
              onClick={fetchSignChallenge}
            >
              Try Again
            </button>
          </div>
        ) : state === SUCCEEDED ? (
          <div>Success!</div>
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({ u2f: state.u2f.get("sign") }),
  dispatch => ({
    fetchSignChallenge: () => dispatch(fetchSignChallenge()),
    fetchSignFinish: resp => dispatch(fetchSignFinish(resp)),
  })
)(SignU2F);
