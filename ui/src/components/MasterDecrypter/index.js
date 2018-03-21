import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { connect } from "react-redux";
import { Set } from "immutable";
import { fetchKeysIfNeeded } from "../../actions/keys";
import { decrypt } from "../../actions/decrypt";
import { uuidv4 } from "../../crypto";
import CircularTimer from "../CircularTimer";
import "./masterDecrypter.css";

// various states
const NONE = Symbol("NONE"); // show decryption buttons
const PIN_REQUIRED = Symbol("PIN_REQUIRED"); // pin required for yubikey
const PASSWORD_REQUIRED = Symbol("PASSWORD_REQUIRED"); // password required for private key
const TAP_REQUIRED = Symbol("TAP_REQUIRED"); // yubikey tap is required

class MasterDecrypter extends Component {
  static propTypes = {
    ciphertextProhibited: PropTypes.bool, // whether just returning ciphertext is allowed
    decrypt: PropTypes.func.isRequired,
    decryptState: ImmutablePropTypes.mapOf(
      ImmutablePropTypes.contains({
        yubikeyTap: ImmutablePropTypes.contains({
          timestamp: PropTypes.number.isRequired,
        }),
        error: ImmutablePropTypes.contains({
          message: PropTypes.string.isRequired,
        }),
      })
    ).isRequired,
    fetchKeysIfNeeded: PropTypes.func.isRequired,
    entries: ImmutablePropTypes.mapOf(
      // one entry for each title must be decrypted
      ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
          key: PropTypes.string.isRequired,
        }).isRequired
      ).isRequired
    ).isRequired,
    keys: ImmutablePropTypes.contains({
      keys: ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
          id: PropTypes.string.isRequired,
          url: PropTypes.string,
          armoredKey: PropTypes.string,
        }).isRequired
      ).isRequired,
    }).isRequired,
    setPlaintexts: PropTypes.func.isRequired, // the resulting plaintexts and their corresponding vault entries are passed to this as params
    setCiphertext: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      password: "",
      pin: "",
      state: NONE,
    };
  }

  componentWillMount() {
    const { fetchKeysIfNeeded } = this.props;
    this.id = uuidv4();

    fetchKeysIfNeeded();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.entries !== nextProps.entries) {
      this.transitionTo(NONE)();
    }

    if (
      this.props.decryptState.getIn([this.id, "yubikeyTap", "timestamp"]) !==
      nextProps.decryptState.getIn([this.id, "yubikeyTap", "timestamp"])
    ) {
      this.transitionTo(TAP_REQUIRED)({
        yubikeyTapTimestamp: nextProps.decryptState.getIn([
          this.id,
          "yubikeyTap",
          "timestamp",
        ]),
      });
      return;
    }

    if (
      !this.props.decryptState.hasIn([this.id, "error"]) &&
      nextProps.decryptState.hasIn([this.id, "error"])
    ) {
      this.transitionTo(NONE)();
    }
  }

  transitionTo = state => extraState => {
    const newState = { state, ...extraState };
    if (state === NONE) {
      newState.pin = "";
      newState.password = "";
      newState.key = null;
    }
    this.setState(newState);
  };

  promptForSecret = key => () => {
    const { entries, setCiphertext } = this.props;

    switch (key.get("device")) {
      case "password":
        // fetch the private key
        this.transitionTo(PASSWORD_REQUIRED)({ key });
        break;
      case "yubikey":
        this.transitionTo(PIN_REQUIRED)({ key });
        break;
      default:
        // return the first ciphertext encrypted by the selected key.
        // if only one title is being decrypted, this is probably what they
        // want, and if multiple titles are being decrypted
        const ciphertext = entries
          .valueSeq()
          .flatten(1)
          .find(e => e.get("key") === key.get("id"))
          .get("encryptedMessage");
        setCiphertext(ciphertext);
    }
  };

  decrypt = async e => {
    e.preventDefault();

    const { entries, decrypt, setPlaintexts } = this.props;
    const { key, pin, password } = this.state;

    let secret;
    switch (key.get("device")) {
      case "password":
        secret = password;
        break;
      case "yubikey":
        secret = pin;
        break;
      default:
        console.error("Received unknown device type to decrypt");
        return;
    }

    // this is guaranteed to get at least one ciphertext from each title
    // because of the way the keys were chosen
    const filteredEntries = entries
      .valueSeq()
      .flatten(1)
      .filter(e => e.get("key") === key.get("id"));
    const ciphertexts = filteredEntries.map(e => e.get("encryptedMessage"));

    let plaintexts;
    try {
      plaintexts = await decrypt(key, ciphertexts, secret, this.id);
    } catch (e) {
      // this should have been handled already in the action creator
      console.error(e);
      throw e;
    }
    setPlaintexts(plaintexts, filteredEntries);
  };

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  getEncryptingKeys = () => {
    const { entries, keys, ciphertextProhibited } = this.props;

    // if all elements will be decrypted at once, a common key is required for each title
    const groupedKeys = entries
      .valueSeq()
      // can't flatmap, because each set of keys might need to be intersected
      .map(es => es.map(e => e.get("key")))
      .map(keys => Set(keys));

    const keyIDs = Set.intersect(groupedKeys);
    let fullKeys = keys.get("keys").filter(k => keyIDs.contains(k.get("id")));
    if (ciphertextProhibited) {
      fullKeys = fullKeys.filter(
        k => k.get("device") === "yubikey" || k.get("device") === "password"
      );
    }

    return fullKeys;
  };

  render() {
    const { state, key, pin, password, yubikeyTapTimestamp } = this.state;
    const { decryptState } = this.props;

    const encryptingKeys = this.getEncryptingKeys();

    return (
      <div className="masterDecrypter">
        {state === NONE ? (
          <div>
            {encryptingKeys.map(key => (
              <button
                key={key.get("id")}
                className="purple"
                onClick={this.promptForSecret(key)}
              >
                {key.get("name")}
              </button>
            ))}
          </div>
        ) : state === PIN_REQUIRED ? (
          <div>
            Decrypt using {key.get("name")}:
            <form className="secretForm">
              <input
                name="pin"
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={this.handleInputChange}
              />
              <div>
                <button
                  type="button"
                  className="nobackground"
                  onClick={this.transitionTo(NONE)}
                >
                  Cancel
                </button>
                <button type="submit" className="purple" onClick={this.decrypt}>
                  Decrypt
                </button>
              </div>
            </form>
          </div>
        ) : state === PASSWORD_REQUIRED ? (
          <div>
            Decrypt using {key.get("name")}:
            <form className="secretForm">
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={this.handleInputChange}
              />
              <div>
                <button
                  type="button"
                  className="nobackground"
                  onClick={this.transitionTo(NONE)}
                >
                  Cancel
                </button>
                <button type="submit" className="purple" onClick={this.decrypt}>
                  Decrypt
                </button>
              </div>
            </form>
          </div>
        ) : state === TAP_REQUIRED ? (
          <div className="tapRequired">
            <div className="textAndTimer">
              Tap your Yubikey
              <CircularTimer key={yubikeyTapTimestamp} />
            </div>
          </div>
        ) : null}
        {decryptState.hasIn([this.id, "error"]) ? (
          <div className="errorText">
            {decryptState.getIn([this.id, "error", "message"])}
          </div>
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({
    keys: state.keys,
    decryptState: state.decrypt,
  }),
  dispatch => ({
    decrypt: (key, ciphertext, secret, id) =>
      dispatch(decrypt(key, ciphertext, secret, id)),
    fetchKeysIfNeeded: () => dispatch(fetchKeysIfNeeded()),
  })
)(MasterDecrypter);
