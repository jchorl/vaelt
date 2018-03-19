import React, { Component } from "react";
import { connect } from "react-redux";
import ImmutablePropTypes from "react-immutable-proptypes";
import PropTypes from "prop-types";
import classNames from "classnames";
import { fetchAllFromVaultIfNeeded } from "../../actions/vault";
import VaultEntry from "./vaultEntry";
import NewVaultEntry from "./newVaultEntry";
import "./vault.css";

class Vault extends Component {
  static propTypes = {
    vault: ImmutablePropTypes.contains({
      entries: ImmutablePropTypes.orderedMapOf(
        ImmutablePropTypes.listOf(
          ImmutablePropTypes.contains({
            title: PropTypes.string.isRequired,
          }).isRequired
        ).isRequired,
        PropTypes.string.isRequired
      ).isRequired,
      lastAdded: PropTypes.string,
    }).isRequired,
  };

  // just some random title to signify a new entry as being selected
  static newEntryTitle = Symbol("NEW_ENTRY");

  constructor(props) {
    super(props);

    this.state = {
      selected: Vault.newEntryTitle,
      search: "",
    };
  }

  componentWillMount() {
    this.props.fetchAllFromVaultIfNeeded();
  }

  componentWillReceiveProps(nextProps) {
    if (
      this.props.vault.get("lastAdded") !== nextProps.vault.get("lastAdded")
    ) {
      this.setState({ selected: nextProps.vault.get("lastAdded") });
    } else if (
      this.props.vault.get("entries").keySeq().size >
      nextProps.vault.get("entries").keySeq().size
    ) {
      this.setState({ selected: Vault.newEntryTitle });
    }
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  select = title => () => {
    this.setState({ selected: title });
  };

  cancelSearch = () => {
    this.setState({ search: "" });
  };

  render() {
    const { selected, search } = this.state;
    let entries = this.props.vault.get("entries");

    if (!!search) {
      entries = entries.filter((_, title) =>
        title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // TODO figure out height display
    return (
      <div className="vault">
        <div className="entryList">
          <div className="searchBar">
            <i className="fa fa-search searchIcon" />
            <input
              type="text"
              name="search"
              value={search}
              onChange={this.handleInputChange}
              placeholder="Search..."
            />
            {!!search ? (
              <i
                className="fa fa-times-circle cancelIcon"
                onClick={this.cancelSearch}
              />
            ) : null}
          </div>
          {!search ? (
            <div
              className={classNames("entry", {
                active: selected === Vault.newEntryTitle,
              })}
              onClick={this.select(Vault.newEntryTitle)}
            >
              New
            </div>
          ) : null}
          {entries.keySeq().map(title => (
            <div
              key={title}
              className={classNames("entry", { active: selected === title })}
              onClick={this.select(title)}
            >
              {title}
            </div>
          ))}
        </div>
        {selected ? (
          selected !== Vault.newEntryTitle ? (
            <VaultEntry title={selected} entries={entries.get(selected)} />
          ) : (
            <NewVaultEntry />
          )
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({ vault: state.vault }),
  dispatch => ({
    fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()),
  })
)(Vault);
