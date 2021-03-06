import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { Map } from "immutable";
import { fetchKeysIfNeeded } from "../../actions/keys";
import { updateVaultEntry } from "../../actions/vault";
import KeyChooser from "./keyChooser";
import "./newVaultEntry.css";

class VaultEntryUpdate extends Component {
  static propTypes = {
    fetchKeysIfNeeded: PropTypes.func.isRequired,
    updateVaultEntry: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    vault: ImmutablePropTypes.contains({
      error: ImmutablePropTypes.contains({
        message: PropTypes.string.isRequired,
      }),
    }).isRequired,
    keys: ImmutablePropTypes.contains({
      keys: ImmutablePropTypes.listOf(
        ImmutablePropTypes.contains({
          id: PropTypes.string.isRequired,
          type: PropTypes.string.isRequired,
        }).isRequired
      ).isRequired,
    }).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      secret: "",
      checkedKeys: Map(),
    };
  }

  componentWillMount() {
    this.props.fetchKeysIfNeeded();
    this.setDefaultKeysEnabled(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.setDefaultKeysEnabled(nextProps);
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  // setDefaultKeysEnabled handles the initial key load or additional key loads
  // and defaults those keys to enabled when encrypting
  setDefaultKeysEnabled = props => {
    // merge the new keys into state
    // actually merge state into the new keys to clobber them with already selected values
    const { checkedKeys } = this.state;
    const { keys } = props;
    const keyIDs = keys
      .get("keys")
      .filter(k => k.get("type") === "public")
      .map(k => k.get("id"));
    let newChecked = keyIDs.reduce(
      (reduction, keyID) => reduction.set(keyID, true),
      Map()
    );
    newChecked = newChecked.merge(checkedKeys);
    this.setState({ checkedKeys: newChecked });
  };

  addSecret = e => {
    e.preventDefault();

    const { title, keys } = this.props;
    const { secret, checkedKeys } = this.state;
    const encryptionKeys = keys
      .get("keys")
      .filter(k => k.get("type") === "public")
      .filter(k => checkedKeys.get(k.get("id")));
    this.props.updateVaultEntry(title, secret, encryptionKeys).then(() => {
      this.setState({
        secret: "",
      });
    });
  };

  onKeysChange = checkedKeys => {
    this.setState({ checkedKeys });
  };

  render() {
    const { secret, checkedKeys } = this.state;
    const { vault, keys } = this.props;
    const publicKeys = keys.get("keys").filter(k => k.get("type") === "public");

    return (
      <form className="vaultEntryUpdate">
        <div className="greyContainer">
          <textarea
            className="secret"
            name="secret"
            placeholder="Secret Contents..."
            onChange={this.handleInputChange}
            value={secret}
          />
          <KeyChooser
            checked={checkedKeys}
            keys={publicKeys}
            onChange={this.onKeysChange}
          />
          {vault.has("updateError") ? (
            <div className="errorText">
              {vault.getIn(["updateError", "message"])}
            </div>
          ) : null}
          <button className="purple" onClick={this.addSecret} type="submit">
            Update
          </button>
        </div>
      </form>
    );
  }
}

export default connect(
  state => ({
    vault: state.vault,
    keys: state.keys,
  }),
  dispatch => ({
    updateVaultEntry: (title, secret, keys) =>
      dispatch(updateVaultEntry(title, secret, keys)),
    fetchKeysIfNeeded: () => dispatch(fetchKeysIfNeeded()),
  })
)(VaultEntryUpdate);
