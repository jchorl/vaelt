import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { connect } from "react-redux";
import { Map } from "immutable";
import classNames from "classnames";
import { uuidv4 } from "../../crypto";
import MasterDecrypter from "../MasterDecrypter";
import "./vaultEntryDecrypt.css";

// various states
const NONE = Symbol("NONE"); // show decryption buttons
const DECRYPTED = Symbol("DECRYPTED"); // show the decrypted message
const CIPHERTEXT = Symbol("CIPHERTEXT"); // for when vaelt cannot decrypt the message, it displays ciphertext

class Decrypt extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    vault: ImmutablePropTypes.contains({
      entries: ImmutablePropTypes.orderedMapOf(
        ImmutablePropTypes.listOf(
          ImmutablePropTypes.contains({
            version: PropTypes.number.isRequired,
          }).isRequired
        ).isRequired
      ).isRequired,
    }).isRequired,
    hideContainer: PropTypes.bool,
    version: PropTypes.number,
  };

  constructor(props) {
    super(props);

    this.state = { state: NONE };
  }

  componentWillMount() {
    this.id = uuidv4();
  }

  componentWillUnmount() {
    if (!!this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  setPlaintexts = plaintexts => {
    // there should only be one entry
    this.transitionTo(DECRYPTED)({ decrypted: plaintexts.get(0) });
    this.hideTimeout = setTimeout(this.transitionTo(NONE), 30 * 1000);
  };

  setCiphertext = ciphertext => {
    this.transitionTo(CIPHERTEXT)({ ciphertext });
  };

  transitionTo = state => extraState => {
    const newState = {
      state,
      ...extraState,
    };

    if (state === NONE) {
      newState.decrypted = "";
      newState.ciphertext = "";
    } else if (state === DECRYPTED || state === CIPHERTEXT) {
      newState.copySuccess = false;
      newState.copyFailed = false;
    }
    this.setState(newState);
  };

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  copy = () => {
    const copyTextarea = document.getElementById(this.id);
    const copyText = copyTextarea.value;

    if (!!navigator.clipboard) {
      return navigator.clipboard.writeText(copyText).then(
        () => {
          this.setState({ copySuccess: true });
          setTimeout(() => {
            navigator.clipboard.writeText("");
          }, 30 * 1000);
        },
        () => {
          this.setState({ copyFailed: true });
        }
      );
    }

    copyTextarea.removeAttribute("disabled");
    copyTextarea.focus();
    copyTextarea.select();

    try {
      const successful = document.execCommand("copy");
      copyTextarea.setAttribute("disabled", "");
      if (successful) {
        this.setState({ copySuccess: true });
      } else {
        this.setState({ copyFailed: true });
      }
    } catch (err) {
      this.setState({ copyFailed: true });
    }
  };

  getEntries = () => {
    const { vault, title } = this.props;
    let { version } = this.props;

    const entries = vault.getIn(["entries", title]);

    // get the latest version
    if (!version) {
      version = Math.max(...entries.map(e => e.get("version")).toJS());
    }

    // filter the entries for that version
    return Map({
      [title]: entries.filter(e => e.get("version") === version),
    });
  };

  render() {
    const {
      state,
      ciphertext,
      decrypted,
      copySuccess,
      copyFailed,
    } = this.state;

    const { hideContainer } = this.props;

    // TODO fix issue of switching between entries
    return (
      <div
        className={classNames("vaultEntryDecrypt", {
          greyContainer: !hideContainer,
        })}
      >
        {state === NONE ? (
          <MasterDecrypter
            entries={this.getEntries()}
            setPlaintexts={this.setPlaintexts}
            setCiphertext={this.setCiphertext}
          />
        ) : state === DECRYPTED ? (
          <div className="decryptedContainer">
            <div className="decrypted">
              <textarea
                id={this.id}
                className="decryptedText"
                value={decrypted}
                disabled
              />
              <button className="nobackground copyButton" onClick={this.copy}>
                {copySuccess ? (
                  <i className="fa fa-check-circle" />
                ) : copyFailed ? (
                  <i className="fa fa-ban" />
                ) : (
                  <i className="fa fa-copy" />
                )}
              </button>
            </div>
            <button className="purple" onClick={this.transitionTo(NONE)}>
              Back
            </button>
          </div>
        ) : state === CIPHERTEXT ? (
          <div className="ciphertextContainer">
            Vaelt cannot decrypt this message. The encrypted value is:
            <div className="ciphertext">
              <textarea
                id={this.id}
                className="ciphertextText"
                value={ciphertext}
                disabled
              />
              <button className="nobackground copyButton" onClick={this.copy}>
                {copySuccess ? (
                  <i className="fa fa-check-circle" />
                ) : copyFailed ? (
                  <i className="fa fa-ban" />
                ) : (
                  <i className="fa fa-copy" />
                )}
              </button>
            </div>
            <button className="purple" onClick={this.transitionTo(NONE)}>
              Back
            </button>
          </div>
        ) : null}
      </div>
    );
  }
}

export default connect(state => ({ vault: state.vault }))(Decrypt);
