import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { connect } from "react-redux";
import { uuidv4 } from "../../crypto";
import { deleteByTitle } from "../../actions/vault";
import ConfirmationDialog from "../ConfirmationDialog";
import "./vaultEntryDelete.css";

class VaultEntryDelete extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    deleteByTitle: PropTypes.func.isRequired,
    vault: ImmutablePropTypes.map.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      showDialog: false,
    };
  }

  componentWillMount() {
    this.id = uuidv4();
  }

  openDialog = () => {
    this.setState({
      showDialog: true,
    });
  };

  closeDialog = () => {
    this.setState({
      showDialog: false,
    });
  };

  deleteEntries = () => {
    const { title, deleteByTitle } = this.props;
    deleteByTitle(this.id, title);
    this.closeDialog();
  };

  render() {
    const { title, vault } = this.props;
    const { showDialog } = this.state;

    return (
      <div className="vaultEntryDelete">
        {showDialog ? (
          <ConfirmationDialog
            message={`Are you sure you want to delete all entries with title "${title}"? You will be unable to recover these entries, which could cause you to get locked out of services.`}
            buttonText="Delete"
            close={this.closeDialog}
            onSuccess={this.deleteEntries}
          />
        ) : null}
        {vault.hasIn([this.id, "error", "message"]) ? (
          <div className="errorText">
            {vault.getIn([this.id, "error", "message"])}
          </div>
        ) : null}
        <button className="danger filled" onClick={this.openDialog}>
          Delete this entry
        </button>
      </div>
    );
  }
}

export default connect(
  state => ({ vault: state.vault }),
  dispatch => ({
    deleteByTitle: (taskID, title) => dispatch(deleteByTitle(taskID, title)),
  })
)(VaultEntryDelete);
