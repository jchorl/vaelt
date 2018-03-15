import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { fetchKeysForVaultEntryIfNeeded } from '../../actions/keys';
import { decrypt } from '../../actions/vault';
import CircularTimer from '../CircularTimer';
import './vaultEntry.css';

const NONE = Symbol('NONE');
const PIN_REQUIRED = Symbol('PIN_REQUIRED');
const TAP_REQUIRED = Symbol('TAP_REQUIRED');
const DECRYPTED = Symbol('DECRYPTED');

class Entry extends Component {
    static propTypes = {
        title: PropTypes.string.isRequired,
        vault: ImmutablePropTypes.contains({
            entries: ImmutablePropTypes.orderedMapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        key: PropTypes.string.isRequired,
                    }).isRequired,
                ).isRequired,
            ).isRequired,
            titleToKeys: ImmutablePropTypes.mapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        name: PropTypes.string.isRequired,
                    }).isRequired,
                ).isRequired,
            ).isRequired,
            error: ImmutablePropTypes.contains({
                message: PropTypes.string.isRequired,
            }),
            yubikeyTapRequired: PropTypes.bool.isRequired,
        }).isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            password: '',
            pin: '',
            state: NONE,
        };
    }

    componentWillMount() {
        const {
            title,
            fetchKeysForVaultEntryIfNeeded,
            vault,
        } = this.props;

        const keyKeys = vault.getIn(['entries', title]).map(e => e.get('key'));
        fetchKeysForVaultEntryIfNeeded(title, keyKeys);
    }

    componentWillReceiveProps(nextProps) {
        if (
            !this.props.vault.get('yubikeyTapRequired') &&
            nextProps.vault.get('yubikeyTapRequired')
        ) {
            this.setState({ state: TAP_REQUIRED });
            return;
        }

        if (
            !this.props.vault.has('error') &&
            nextProps.vault.has('error')
        ) {
            this.setState({
                state: NONE,
                pin: '',
                password: '',
            });
        }
    }

    transitionTo = state => () => {
        this.setState({ state });
    }

    promptForSecret = id => () => {
        const { vault, title } = this.props;
        const key = vault.getIn(['titleToKeys', title]).find(k => k.get('id') === id);

        switch (key.get('device')) {
            case 'password':
                // fetch the private key
                console.log('should prompt for password');
                break;
            case 'yubikey':
                this.setState({
                    state: PIN_REQUIRED,
                    key,
                });
                break;
            default:
                console.log('should dispatch error');
        }
    }

    decrypt = async e => {
        e.preventDefault();

        const { decrypt, title } = this.props;
        const { key, pin, password } = this.state;

        let secret;
        switch (key.get('device')) {
            case 'password':
                secret = password;
                break;
            case 'yubikey':
                secret = pin;
                break;
            default:
                console.error('Received unknown device type to decrypt');
        }

        try {
            const decrypted = await decrypt(key, title, secret);
            this.setState({
                decrypted,
                state: DECRYPTED,
            });
        } catch (e) {
            // this should have been handled already in the action creator
        }
    }

    handleInputChange = event => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value,
        });
    }

    render() {
        const { state, key, pin, decrypted } = this.state;
        const { title, vault } = this.props;
        const encryptingKeys = vault.getIn(['titleToKeys', title], List());

        return (
            <div className="vaultEntry">
                <div className="whiteContainer">
                    <h2>{ title }</h2>
                    {
                    state === NONE
                    ? (
                    <div>
                        <div>
                            Decrypt using...
                        </div>
                        <div className="decryptButtons">
                            {
                            encryptingKeys.map(key =>
                            <button key={ key } className="purple" onClick={ this.promptForSecret(key.get('id')) }>{ key.get('name') }</button>
                            )
                            }
                        </div>
                    </div>
                    )
                    : state === DECRYPTED
                    ? (
                    <div>
                        Decrypted: { decrypted }
                    </div>
                    )
                    : state === PIN_REQUIRED
                    ? (
                    <div>
                        Decrypt using { key.get('name') }:
                        <form className="secretForm">
                            <input name="pin" type="password" placeholder="PIN" value={ pin } onChange={ this.handleInputChange }/>
                            <div>
                                <button type="button" className="nobackground" onClick={ this.transitionTo(NONE) }>Cancel</button>
                                <button type="submit" className="purple" onClick={ this.decrypt }>Decrypt</button>
                            </div>
                        </form>
                    </div>
                    )
                    : state === TAP_REQUIRED
                    ? (
                    <div className="tapRequired">
                        Tap your Yubikey
                        <CircularTimer />
                    </div>
                    )
                    : null
                    }
                    {
                    vault.has('error')
                    ? <div className="errorText">{ vault.getIn(['error', 'message']) }</div>
                    : null
                    }
                </div>
            </div>
            );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({
        decrypt: (key, title, secret) => dispatch(decrypt(key, title, secret)),
        fetchKeysForVaultEntryIfNeeded: (title, keyKeys) => dispatch(fetchKeysForVaultEntryIfNeeded(title, keyKeys)),
    })
)(Entry);
