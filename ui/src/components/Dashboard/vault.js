import React, { Component } from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { fetchAllFromVaultIfNeeded } from '../../actions/vault';
import VaultEntry from './vaultEntry';
import NewVaultEntry from './newVaultEntry';
import './vault.css';

class Vault extends Component {
    static propTypes = {
        vault: ImmutablePropTypes.contains({
            entries: ImmutablePropTypes.orderedMapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        title: PropTypes.string.isRequired,
                    }).isRequired,
                ).isRequired,
                PropTypes.string.isRequired,
            ).isRequired,
            lastAdded: PropTypes.string,
        }).isRequired,
    }

    // just some random title to signify a new entry as being selected
    static newEntryTitle = Symbol('NEW_ENTRY');

    constructor(props) {
        super(props);

        this.state = {
            selected: Vault.newEntryTitle,
        }
    }

    componentWillMount() {
        this.props.fetchAllFromVaultIfNeeded();
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.vault.has('lastAdded') && nextProps.vault.has('lastAdded')) {
            this.setState({ selected: nextProps.vault.get('lastAdded') });
        }
    }

    select = title => () => {
        this.setState({ selected: title });
    }

    render() {
        const entries = this.props.vault.get('entries');
        const { selected } = this.state;

        return (
            <div className="vault">
                <div className="entryList">
                    <div className={ classNames("entry", { active: selected === Vault.newEntryTitle }) } onClick={ this.select(Vault.newEntryTitle) }>New</div>
                    { entries.keySeq().map(title => (
                    <div key={ title } className={ classNames("entry", { active: selected === title }) } onClick={ this.select(title) }>{ title }</div>
                    )) }
                </div>
                { selected
                  ? selected !== Vault.newEntryTitle
                  ? <VaultEntry title={ selected } entries={ entries.get(selected) } />
                  : <NewVaultEntry />
                  : null }
            </div>
            );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({ fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()) }),
)(Vault);
