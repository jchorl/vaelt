import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { addToVault } from "../../actions/vault";
import HelpPopup from "../HelpPopup";
import "./newVaultEntry.css";

class NewVaultEntry extends Component {
  static propTypes = {
    addToVault: PropTypes.func.isRequired,
    vault: ImmutablePropTypes.contains({
      error: ImmutablePropTypes.contains({
        message: PropTypes.string.isRequired,
      }),
    }).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      title: "",
      secret: "",
    };
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  addSecret = e => {
    e.preventDefault();

    const { title, secret } = this.state;
    this.props.addToVault(title, secret);
  };

  render() {
    const { title, secret } = this.state;
    const { vault } = this.props;

    return (
      <div className="newVaultEntry">
        <form className="whiteContainer">
          <h2>
            Add to Vault{" "}
            <HelpPopup message="This will encrypt secret contents with all of your public keys and put the encrypted values in the vault." />
          </h2>
          <div className="greyContainer">
            <input
              className="title"
              name="title"
              type="text"
              placeholder="Title"
              onChange={this.handleInputChange}
              value={title}
            />
            <textarea
              className="secret"
              name="secret"
              placeholder="Secret Contents..."
              onChange={this.handleInputChange}
              value={secret}
            />
            {vault.has("error") ? (
              <div className="errorText">
                {vault.getIn(["error", "message"])}
              </div>
            ) : null}
            <button className="purple" onClick={this.addSecret} type="submit">
              Add
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default connect(
  state => ({ vault: state.vault }),
  dispatch => ({
    addToVault: (title, secret) => dispatch(addToVault(title, secret)),
  })
)(NewVaultEntry);
