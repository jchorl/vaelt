import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
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
                    <VaultEntryDecrypt title={ title } />
                </div>
            </div>
            );
    }
}
