import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { fetchAllFromVaultIfNeeded } from "../../actions/vault";
import { checkPasswords } from "../../actions/hibp";
import HelpPopup from "../HelpPopup";
import MasterDecrypter from "../MasterDecrypter";
import "./hibp.css";

const NONE = Symbol("NONE");
const RESULTS = Symbol("RESULTS");

class HIBP extends Component {
  static propTypes = {
    hibp: ImmutablePropTypes.contains({
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
  };

  constructor(props) {
    super(props);

    this.state = {
      state: NONE,
    };
  }

  componentWillMount() {
    this.props.fetchAllFromVaultIfNeeded();
  }

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

  setPlaintexts = async (plaintexts, entries) => {
    const leaked = await this.props.checkPasswords(plaintexts);
    const titles = plaintexts
      .zip(entries)
      .filter(([plaintext, entry]) => leaked.contains(plaintext))
      .map(([, entry]) => entry.get("title"));
    this.setState({
      state: RESULTS,
      leaked: titles,
    });
  };

  render() {
    const { leaked, state } = this.state;
    const { hibp } = this.props;

    return (
      <div className="hibp section">
        <h2>
          Check for Password Leaks{" "}
          <HelpPopup message="This checks your passwords against Have I Been Pwned to see if any have been leaked" />
        </h2>
        {state === NONE ? (
          <div className="greyContainer">
            <div className="pleaseDecrypt">
              Please decrypt the entries before they can be checked against{" "}
              <a
                href="https://haveibeenpwned.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Have I Been Pwned
              </a>. Your passwords will not be sent in plaintext. The security
              is explained{" "}
              <a
                href="https://haveibeenpwned.com/API/v2#SearchingPwnedPasswordsByRange"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>.
            </div>
            <MasterDecrypter
              entries={this.getAllEntries()}
              ciphertextProhibited={true}
              setPlaintexts={this.setPlaintexts}
            />
            {hibp.hasIn(["error", "message"]) ? (
              <div className="errorText">
                {hibp.getIn(["error", "message"])}
              </div>
            ) : null}
          </div>
        ) : state === RESULTS ? (
          <div className="greyContainer">
            {leaked.isEmpty() ? (
              <span>None of your passwords were found to have been leaked</span>
            ) : (
              <span className="danger">
                The following entries were likely leaked and should be changed:{" "}
                <div>{leaked.join(", ")}</div>
              </span>
            )}
          </div>
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({
    vaultEntries: state.vault.get("entries"),
    hibp: state.hibp,
  }),
  dispatch => ({
    fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()),
    checkPasswords: plaintexts => dispatch(checkPasswords(plaintexts)),
  })
)(HIBP);
