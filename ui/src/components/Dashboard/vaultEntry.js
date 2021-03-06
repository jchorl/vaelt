import React, { Component } from "react";
import PropTypes from "prop-types";
import VaultEntryDecrypt from "./vaultEntryDecrypt";
import VaultEntryDelete from "./vaultEntryDelete";
import VaultEntryUpdate from "./vaultEntryUpdate";
import VaultEntryPreviousVersions from "./vaultEntryPreviousVersions";
import HelpPopup from "../HelpPopup";
import "./vaultEntry.css";

export default class Entry extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
  };

  render() {
    const { title } = this.props;

    return (
      <div className="vaultEntry">
        <div className="whiteContainer">
          <h2>{title}</h2>
          <div className="section">
            <div>Decrypt</div>
            <VaultEntryDecrypt key={title} title={title} />
          </div>
          <div className="section">
            <div>
              Update<HelpPopup message="This will encrypt secret contents with all of your public keys and add the new version to the vault." />
            </div>
            <VaultEntryUpdate key={title} title={title} />
          </div>
          <div className="section">
            <div>Previous Versions</div>
            <VaultEntryPreviousVersions key={title} title={title} />
          </div>
          <div className="section">
            <div>Delete</div>
            <VaultEntryDelete title={title} />
          </div>
        </div>
      </div>
    );
  }
}
