import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { generateKeyPair } from "../../crypto";
import {
  addKeys,
  fetchKeysIfNeeded,
  fetchKeyByID,
  revokeKey,
} from "../../actions/keys";
import {
  fetchAllFromVaultIfNeeded,
  reencryptWithNewKey,
} from "../../actions/vault";
import { getPublicKey } from "../../yubikey";
import MasterDecrypter from "../MasterDecrypter";
import HelpPopup from "../HelpPopup";
import ConfirmationDialog from "../ConfirmationDialog";
import "./keys.css";

const NONE = Symbol("NONE");
const ADD_FROM_YUBIKEY = Symbol("ADD_FROM_YUBIKEY");
const ADD_FROM_URL = Symbol("ADD_FROM_URL");
const ADD_FROM_KEY = Symbol("ADD_FROM_KEY");
const ADD_NEW_PASSWORD = Symbol("ADD_NEW_PASSWORD");
const PROMPT_FOR_REENCRYPTION = Symbol("PROMPT_FOR_REENCRYPTION");
const DECRYPT_ALL = Symbol("DECRYPT_ALL");

class Keys extends Component {
  static propTypes = {
    addKeys: PropTypes.func.isRequired,
    fetchKeysIfNeeded: PropTypes.func.isRequired,
    fetchKeyByID: PropTypes.func.isRequired,
    revokeKey: PropTypes.func.isRequired,
    email: PropTypes.string,
    keys: ImmutablePropTypes.contains({
      keys: ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
          id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          createdAt: PropTypes.instanceOf(Date).isRequired,
        })
      ).isRequired,
      error: ImmutablePropTypes.contains({
        message: PropTypes.string.isRequired,
      }),
    }).isRequired,
    vaultEntries: ImmutablePropTypes.orderedMapOf(
      ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
          version: PropTypes.number.isRequired,
        }).isRequired
      ).isRequired
    ).isRequired,
    u2fEnforced: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {
      state: NONE,
      name: "",
      url: "",
      armoredKey: "",
      showDialog: false,
      password: "",
    };
  }

  componentWillMount() {
    this.props.fetchKeysIfNeeded();
  }

  componentWillReceiveProps(nextProps) {
    // add key success (but also just the first key fetch)
    if (nextProps.keys.get("keys").size > this.props.keys.get("keys").size) {
      // reset name, url and armoredKey
      this.setState({ name: "", url: "", armoredKey: "" });
    }
  }

  addFromYubikey = async e => {
    e.preventDefault();

    const url = await getPublicKey();
    const { name } = this.state;
    const key = {
      name,
      url,
      type: "public",
      device: "yubikey",
    };
    this.props.addKeys([key]).then(this.addKeySuccess);
  };

  addFromURL = e => {
    e.preventDefault();

    const { name, url } = this.state;
    const key = {
      name,
      url,
      type: "public",
      device: "unknown",
    };
    this.props.addKeys([key]).then(this.addKeySuccess);
  };

  addFromArmoredKey = e => {
    e.preventDefault();

    const { name, armoredKey } = this.state;
    const key = {
      name,
      armoredKey,
      type: "public",
      device: "unknown",
    };
    this.props.addKeys([key]).then(this.addKeySuccess);
  };

  addNewPassword = async e => {
    e.preventDefault();

    const { name, password } = this.state;
    const { email } = this.props;

    // generate a keypair
    const key = await generateKeyPair(email, password);
    const keys = [
      {
        armoredKey: key.privateKeyArmored,
        type: "private",
        name,
        device: "password",
      },
      {
        armoredKey: key.publicKeyArmored,
        type: "public",
        name,
        device: "password",
      },
    ];
    this.props.addKeys(keys).then(this.addKeySuccess);
  };

  addKeySuccess = resp => {
    this.setState({
      newKey: resp.keys.find(k => k.get("type") === "public"),
      state: PROMPT_FOR_REENCRYPTION,
    });
  };

  transitionTo = state => () => {
    if (state === DECRYPT_ALL) {
      this.props.fetchAllFromVaultIfNeeded();
    }
    this.setState({ state });
  };

  getAllEntries = () => {
    const { vaultEntries } = this.props;

    // get the latest version for each title
    const maxVersionByTitle = vaultEntries.map(entries =>
      entries
        .map(e => e.get("version"))
        .reduce((reduction, value) => Math.max(reduction, value), 0)
    );

    return vaultEntries.map((entries, title) =>
      entries.filter(e => e.get("version") === maxVersionByTitle.get(title))
    );
  };

  setPlaintexts = (plaintexts, entries) => {
    const { reencryptWithNewKey } = this.props;
    const { newKey } = this.state;
    reencryptWithNewKey(plaintexts, entries, newKey).then(
      this.transitionTo(NONE)
    );
  };

  revoke = id => () => {
    this.hideRevokeDialog();
    this.props.revokeKey(id);
  };

  showRevokeDialog = id => () => {
    this.setState({ showDialog: true, idToRevoke: id });
  };

  hideRevokeDialog = () => {
    this.setState({ showDialog: false, idToRevoke: null });
  };

  show = id => async () => {
    let key = this.props.keys.get("keys").find(v => v.get("id") === id);
    // if the key is a url, just open that url
    if (!!key.get("url")) {
      window.open(key.get("url"));
      return;
    } else if (!key.get("armoredKey")) {
      // private keys arent saved in redux
      key = await this.props.fetchKeyByID(key.get("id"));
    }
    // some hack to write the key in a new window/tab
    const x = window.open();
    if (!x) {
      alert("You might have popups blocked");
      return;
    }
    x.document.open();
    x.document.write("<pre>" + key.get("armoredKey") + "</pre>");
    x.document.close();
  };

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  render() {
    const {
      state,
      name,
      url,
      armoredKey,
      showDialog,
      idToRevoke,
      password,
    } = this.state;
    const { keys } = this.props;
    const allKeys = keys.get("keys");

    let revokeConfirmationMessage, revokeButtonText;
    if (showDialog) {
      const key = keys.get("keys").find(k => k.get("id") === idToRevoke);
      if (key.get("type") === "public") {
        revokeButtonText = "Revoke";
        revokeConfirmationMessage = `Are you sure you want to revoke the key "${key.get(
          "name"
        )}"? You will no longer be able to decrypt vault entries with the corresponding private key. This cannot be undone.`;
      } else {
        revokeButtonText = "Delete";
        revokeConfirmationMessage = `Are you sure you want to delete the key "${key.get(
          "name"
        )}"? You will no longer be able to decrypt vault entries with this key after it is deleted. This cannot be undone.`;
      }
    }

    // TODO add a help section specifying how to set up a yubikey
    return (
      <div className="keys section">
        <h2>Keys</h2>
        <div className="greyContainer">
          <div className="table">
            {allKeys.isEmpty()
              ? "There are no keys. Please register a new key."
              : null}
            {allKeys.map(k => (
              <div key={k.get("id")} className="tableEntry">
                <div className="keyName">
                  {k.get("name")}
                  {k.get("type") === "private" ? (
                    <span className="privateText"> (private)</span>
                  ) : null}
                </div>
                <div className="keyCreatedAt">
                  {k.get("createdAt").toLocaleDateString()}
                </div>
                <div className="keyButtons">
                  <button
                    className="nobackground"
                    onClick={this.show(k.get("id"))}
                  >
                    Show
                  </button>
                  <button
                    className="danger"
                    onClick={this.showRevokeDialog(k.get("id"))}
                  >
                    {k.get("type") === "public" ? "Revoke" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {state === NONE ? (
            <div className="addFromButtons">
              <button
                className="purple"
                onClick={this.transitionTo(ADD_FROM_YUBIKEY)}
              >
                Add From Yubikey{" "}
                <HelpPopup message="See the Help section for properly configuring a Yubikey" />
              </button>
              <button
                className="purple"
                onClick={this.transitionTo(ADD_FROM_URL)}
              >
                Add From URL{" "}
                <HelpPopup message="The URL should be the URL to a public GPG key." />
              </button>
              <button
                className="purple"
                onClick={this.transitionTo(ADD_NEW_PASSWORD)}
              >
                Add New Password
              </button>
              <button
                className="purple"
                onClick={this.transitionTo(ADD_FROM_KEY)}
              >
                Add From Armored Key
              </button>
            </div>
          ) : state === ADD_FROM_YUBIKEY ? (
            <div>
              Add from Yubikey
              <form className="nameForm">
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  onChange={this.handleInputChange}
                  value={name}
                />
                <div>
                  <button
                    type="button"
                    className="nobackground"
                    onClick={this.transitionTo(NONE)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="purple"
                    onClick={this.addFromYubikey}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          ) : state === ADD_FROM_URL ? (
            <div>
              Add from URL
              <form className="nameUrlForm">
                <div className="urlForm">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={this.handleInputChange}
                    value={name}
                  />
                  <input
                    type="text"
                    name="url"
                    placeholder="URL"
                    onChange={this.handleInputChange}
                    value={url}
                  />
                </div>
                <div className="urlFormButtons">
                  <button
                    type="button"
                    className="nobackground"
                    onClick={this.transitionTo(NONE)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="purple"
                    onClick={this.addFromURL}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          ) : state === ADD_FROM_KEY ? (
            <div>
              Add from Armored Key
              <form className="nameKeyForm">
                <div className="keyForm">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={this.handleInputChange}
                    value={name}
                  />
                  <textarea
                    name="armoredKey"
                    placeholder="Armored Key..."
                    onChange={this.handleInputChange}
                    value={armoredKey}
                  />
                </div>
                <div className="keyFormButtons">
                  <button
                    type="button"
                    className="nobackground"
                    onClick={this.transitionTo(NONE)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="purple"
                    onClick={this.addFromArmoredKey}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          ) : state === ADD_NEW_PASSWORD ? (
            <div>
              Add new password
              <form className="namePasswordForm">
                <div className="passwordForm">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={this.handleInputChange}
                    value={name}
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password..."
                    onChange={this.handleInputChange}
                    value={password}
                  />
                </div>
                <div className="passwordFormButtons">
                  <button
                    type="button"
                    className="nobackground"
                    onClick={this.transitionTo(NONE)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="purple"
                    onClick={this.addNewPassword}
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          ) : state === PROMPT_FOR_REENCRYPTION ? (
            <div className="promptForReencryption">
              Would you like to encrypt all vault entries with the new key? You
              will have to decrypt them all first.
              <div className="promptForReencryptionButtons">
                <button
                  className="nobackground"
                  onClick={this.transitionTo(NONE)}
                >
                  No
                </button>
                <button
                  className="purple"
                  onClick={this.transitionTo(DECRYPT_ALL)}
                >
                  Yes
                </button>
              </div>
            </div>
          ) : state === DECRYPT_ALL ? (
            <div>
              <div className="pleaseDecrypt">
                Please decrypt the entries before they can be re-encrypted:
              </div>
              <MasterDecrypter
                entries={this.getAllEntries()}
                ciphertextProhibited={true}
                setPlaintexts={this.setPlaintexts}
              />
            </div>
          ) : null}
          {keys.has("error") ? (
            <div className="errorText">{keys.getIn(["error", "message"])}</div>
          ) : null}
        </div>
        {showDialog ? (
          <ConfirmationDialog
            message={revokeConfirmationMessage}
            buttonText={revokeButtonText}
            close={this.hideRevokeDialog}
            onSuccess={this.revoke(idToRevoke)}
          />
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({
    keys: state.keys,
    vaultEntries: state.vault.get("entries"),
    email: state.user.getIn(["user", "email"]),
  }),
  dispatch => ({
    fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()),
    fetchKeysIfNeeded: () => dispatch(fetchKeysIfNeeded()),
    fetchKeyByID: id => dispatch(fetchKeyByID(id)),
    addKeys: keys => dispatch(addKeys(keys)),
    revokeKey: id => dispatch(revokeKey(id)),
    reencryptWithNewKey: (secrets, entries, key) =>
      dispatch(reencryptWithNewKey(secrets, entries, key)),
  })
)(Keys);
