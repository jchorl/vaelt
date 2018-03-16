import React, { Component } from 'react';
import PropTypes from 'prop-types';
import VaultEntryDecrypt from './vaultEntryDecrypt';
import './vaultEntry.css';

export default class Entry extends Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
    }

    render() {
        const { title } = this.props;

        return (
            <div className="vaultEntry">
                <div className="whiteContainer">
                    <h2>{ title }</h2>
                    <div>Decrypt</div>
                    <VaultEntryDecrypt title={ title } />
                </div>
            </div>
            );
    }
}
