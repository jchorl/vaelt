import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import './vaultEntry.css';

export default class Entry extends Component {
    static propTypes = {
        entry: ImmutablePropTypes.contains({
            title: PropTypes.string.isRequired,
        }).isRequired,
    }

    render() {
        const { entry } = this.props;

        return (
            <div className="vaultEntry">
                { entry.get('title') }
            </div>
            );
    }
}
