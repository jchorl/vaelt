import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { fetchKeysForVaultEntry } from '../../actions/keys';
import './vaultEntry.css';

class Entry extends Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
    }

    componentWillMount() {
        const { title, fetchKeysForVaultEntry } = this.props;
        // fetch the private keys
        // and set them in component state so they get destroyed with the component
        // even though theyre pretty useless without passcodes and such
        fetchKeysForVaultEntry(title);
        // TODO show the keys as buttons so the user can pick which one to use
        // this will probably require storing a key type in each key to discern whether it is
        // yubikey, password, or neither (in which case just show them the armored ciphertext)
    }

    render() {
        const { title } = this.props;

        return (
            <div className="vaultEntry">
                <div className="whiteContainer">
                    <h2>{ title }</h2>
                </div>
            </div>
            );
    }
}

export default connect(
    undefined,
    dispatch => ({
        fetchKeysForVaultEntry: title => dispatch(fetchKeysForVaultEntry(title)),
    })
)(Entry);
