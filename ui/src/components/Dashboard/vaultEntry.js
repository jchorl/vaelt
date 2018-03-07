import React, { Component } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import './vaultEntry.css';

export default class Entry extends Component {
    static propTypes = {
        entries: ImmutablePropTypes.listOf(
            ImmutablePropTypes.contains({
                title: PropTypes.string.isRequired,
            }).isRequired,
        ).isRequired,
        title: PropTypes.string.isRequired,
    }

    render() {
        const { title } = this.props;

        return (
            <div className="vaultEntry">
                { title }
            </div>
            );
    }
}
