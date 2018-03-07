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
            entries: ImmutablePropTypes.orderedMapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        title: PropTypes.string.isRequired,
                    }).isRequired,
                ).isRequired,
                PropTypes.string.isRequired,
            ).isRequired,
        }).isRequired,
    }

    // just some random title to signify a new entry as being selected
    static newEntryTitle = 'b8e1502e-7f5f-4d36-97d3-8ce11aadcfb0';

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

    selectDefaultEntry = props => {
        if (!this.state.selected && !props.vault.get('entries').isEmpty()) {
            this.setState({ selected: props.vault.get('entries').keySeq().first() });
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
                  : null
                  : null }
            </div>
            );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({ fetchAllFromVaultIfNeeded: () => dispatch(fetchAllFromVaultIfNeeded()) }),
)(Vault);
