import React, { Component } from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { fetchAllFromVaultIfNeeded } from '../../actions/vault';
import VaultEntry from './vaultEntry';
import './vault.css';

class Vault extends Component {
    static propTypes = {
        vault: ImmutablePropTypes.contains({
            entries: ImmutablePropTypes.listOf(
                ImmutablePropTypes.contains({
                    title: PropTypes.string.isRequired,
                }).isRequired,
            ).isRequired,
        }).isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            selected: null,
        }
    }

    componentWillMount() {
        this.props.fetchAllFromVaultIfNeeded();
        this.selectDefaultEntry(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.selectDefaultEntry(nextProps);
    }

    selectDefaultEntry = (props) => {
        if (!this.state.selected && !props.vault.get('entries').isEmpty()) {
            this.setState({ selected: props.vault.get('entries').first() });
        }
    }

    render() {
        const entries = this.props.vault.get('entries');
        const { selected } = this.state;

        return (
            <div className="vault">
                <div className="entryList">
                    <div className="entry">New</div>
                    { entries.map(e => (
                    <div key={ e.get('title') } className={ classNames("entry", { active: selected === e }) }>{ e.get('title') }</div>
                    )) }
                </div>
                { selected ? <VaultEntry entry={ selected } /> : null }
            </div>
            );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({ fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()) }),
)(Vault);
