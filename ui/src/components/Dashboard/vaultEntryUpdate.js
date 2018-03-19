import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { addToVault } from '../../actions/vault';
import { fetchKeysForVaultEntry } from '../../actions/keys';
import './newVaultEntry.css';

class VaultEntryUpdate extends Component {
    static propTypes = {
        addToVault: PropTypes.func.isRequired,
        fetchKeysForVaultEntry: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired,
        vault: ImmutablePropTypes.contains({
            error: ImmutablePropTypes.contains({
                message: PropTypes.string.isRequired,
            }),
        }).isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            secret: '',
        };
    }

    handleInputChange = event => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value,
        });
    }

    addSecret = e => {
        e.preventDefault();

        const { title } = this.props;
        const { secret } = this.state;
        this.props.addToVault(title, secret)
            .then(() => {
                // need to fetch the keys so the decryption ui will be updated
                const {
                    title,
                    fetchKeysForVaultEntry,
                    vault,
                } = this.props;

                const keyKeys = vault.getIn(['entries', title])
                    .map(e => e.get('key'))
                    .toSet();
                return fetchKeysForVaultEntry(title, keyKeys);
            })
            .then(() => {
                this.setState({
                    secret: '',
                });
            });
    }

    render() {
        const { secret } = this.state;
        const { vault } = this.props;

        return (
                <form className="vaultEntryUpdate">
                    <div className="greyContainer">
                        <textarea className="secret" name="secret" placeholder="Secret Contents..." onChange={ this.handleInputChange } value={ secret } />
                        {
                        vault.has('updateError')
                        ? <div className="errorText">{ vault.getIn(['updateError', 'message']) }</div>
                        : null
                        }
                        <button className="purple" onClick={ this.addSecret } type="submit">Update</button>
                    </div>
                </form>
        );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({
        addToVault: (title, secret) => dispatch(addToVault(title, secret, true)),
        fetchKeysForVaultEntry: (title, keyKeys) => dispatch(fetchKeysForVaultEntry(title, keyKeys)),
    })
)(VaultEntryUpdate);
