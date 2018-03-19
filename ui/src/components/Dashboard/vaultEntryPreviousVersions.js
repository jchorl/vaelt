import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { List, Set } from "immutable";
import { connect } from "react-redux";
import VaultEntryDecrypt from "./vaultEntryDecrypt.js";
import "./vaultEntryPreviousVersions.css";

class PreviousVersions extends Component {
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
  };

  constructor(props) {
    super(props);

    this.state = {
      open: Set(),
    };
  }

  toggle = version => () => {
    let open = this.state.open;
    if (open.contains(version)) {
      open = open.delete(version);
    } else {
      open = open.add(version);
    }

    this.setState({
      open,
    });
  };

  render() {
    const { open } = this.state;
    const { vault, title } = this.props;
    const versions = vault
      .getIn(["entries", title], List())
      .map(e => e.get("version"))
      .toSet()
      .sort((v1, v2) => v1 < v2)
      .skip(1);

    return (
      <div className="vaultEntryPreviousVersions greyContainer">
        {versions.isEmpty() ? <div>None</div> : null}
        {versions.map(v => (
          <div key={v}>
            <div onClick={this.toggle(v)} className="version">
              {open.contains(v) ? (
                <i className="fa fa-caret-down triangle" />
              ) : (
                <i className="fa fa-caret-right triangle" />
              )}
              Version {v}
            </div>
            {open.contains(v) ? (
              <div className="decrypt">
                <VaultEntryDecrypt title={title} version={v} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
}

export default connect(state => ({ vault: state.vault }))(PreviousVersions);
