import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { fetchKeysForVaultEntryIfNeeded } from '../../actions/keys';
import { decrypt } from '../../actions/vault';
import CircularTimer from '../CircularTimer';
import './vaultEntryDecrypt.css';

// various states
const NONE = Symbol('NONE'); // show decryption buttons
const PIN_REQUIRED = Symbol('PIN_REQUIRED'); // pin required for yubikey
const PASSWORD_REQUIRED = Symbol('PASSWORD_REQUIRED'); // password required for private key
const TAP_REQUIRED = Symbol('TAP_REQUIRED'); // yubikey tap is required
const DECRYPTED = Symbol('DECRYPTED'); // show the decrypted message
const CIPHERTEXT = Symbol('CIPHERTEXT'); // for when vaelt cannot decrypt the message, it displays ciphertext

class Decrypt extends Component {
    static propTypes = {
        decrypt: PropTypes.func.isRequired,
        fetchKeysForVaultEntryIfNeeded: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired,
        vault: ImmutablePropTypes.contains({
            entries: ImmutablePropTypes.orderedMapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        key: PropTypes.string.isRequired,
                        version: PropTypes.number.isRequired,
                    }).isRequired,
                ).isRequired,
            ).isRequired,
            titleToKeys: ImmutablePropTypes.mapOf(
                ImmutablePropTypes.listOf(
                    ImmutablePropTypes.contains({
                        id: PropTypes.string.isRequired,
                        name: PropTypes.string.isRequired,
                    }).isRequired,
                ).isRequired,
            ).isRequired,
            decryptionError: ImmutablePropTypes.contains({
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

        const keyKeys = vault.getIn(['entries', title])
            .map(e => e.get('key'))
            .toSet();
        fetchKeysForVaultEntryIfNeeded(title, keyKeys);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.title !== nextProps.title) {
            const keyKeys = nextProps.vault.getIn(['entries', nextProps.title]).map(e => e.get('key'));
            nextProps.fetchKeysForVaultEntryIfNeeded(nextProps.title, keyKeys);

            this.transitionTo(NONE)();
        }

        if (
            !this.props.vault.get('yubikeyTapRequired') &&
            nextProps.vault.get('yubikeyTapRequired')
        ) {
            this.transitionTo(TAP_REQUIRED)();
            return;
        }

        if (
            !this.props.vault.has('decryptionError') &&
            nextProps.vault.has('decryptionError')
        ) {
            this.transitionTo(NONE);
        }
    }

    transitionTo = state => extraState => {
        const newState = { state, ...extraState };
        if (state === NONE) {
            newState.pin = '';
            newState.password = '';
            newState.decrypted = '';
            newState.ciphertext = '';
            newState.key = null;
        } else if (state === DECRYPTED) {
            newState.copySuccess = false;
            newState.copyFailed = false;
        }
        this.setState(newState);
    }

    promptForSecret = id => () => {
        const { vault, title } = this.props;
        const key = vault.getIn(['titleToKeys', title]).find(k => k.get('id') === id);

        switch (key.get('device')) {
            case 'password':
                // fetch the private key
                this.transitionTo(PASSWORD_REQUIRED)({ key });
                break;
            case 'yubikey':
                this.transitionTo(PIN_REQUIRED)({ key });
                break;
            default:
                const ciphertext = vault
                    .getIn(['entries', title])
                    .find(e => e.get('key') === id)
                    .get('encryptedMessage');
                this.transitionTo(CIPHERTEXT)({ ciphertext });
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
                return;
        }

        try {
            const decrypted = await decrypt(key, title, secret);
            this.transitionTo(DECRYPTED)({ decrypted });
            setTimeout(this.transitionTo(NONE), 30 * 1000);
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

    copy = elementId => () => {
        let copyText;
        let copyTextarea;
        if (elementId === 'decryptedText') {
            copyText = this.state.decrypted;
            copyTextarea = document.getElementById('decryptedText');
        } else {
            copyText = this.state.ciphertext;
            copyTextarea = document.getElementById('ciphertextText');
        }

        if (!!navigator.clipboard) {
            return navigator.clipboard.writeText(copyText).then(
                () => {
                    this.setState({ copySuccess: true });
                    setTimeout(() => {
                        navigator.clipboard.writeText('')
                    }, 30 * 1000);
                },
                () => {
                    this.setState({ copyFailed: true });
                });
        }

        copyTextarea.removeAttribute('disabled');
        copyTextarea.focus();
        copyTextarea.select();

        try {
            const successful = document.execCommand('copy');
            copyTextarea.setAttribute('disabled', '');
            if (successful) {
                this.setState({ copySuccess: true });
            } else {
                this.setState({ copyFailed: true });
            }
        } catch (err) {
            this.setState({ copyFailed: true });
        }
    }

    getEncryptingKeys = () => {
        const { vault, title } = this.props;

        // get the encrypting keys, but only for the latest version
        const currVersion = Math.max(...vault.getIn(['entries', title]).map(e => e.get('version')).toJS());
        const keyIDs = vault.getIn(['entries', title])
            .filter(e => e.get('version') === currVersion)
            .map(e => e.get('key'))
            .toSet();
        const encryptingKeys = vault.getIn(['titleToKeys', title], List()).filter(k => keyIDs.contains(k.get('id')));
        return encryptingKeys;
    }

    render() {
        const {
            state,
            key,
            pin,
            password,
            ciphertext,
            decrypted,
            copySuccess,
            copyFailed,
        } = this.state;
        const { vault } = this.props;

        const encryptingKeys = this.getEncryptingKeys();

        return (
            <div className="greyContainer vaultEntryDecrypt">
                {
                state === NONE
                ? (
                <div>
                    {
                    encryptingKeys.map(key =>
                    <button key={ key.get('id') } className="purple" onClick={ this.promptForSecret(key.get('id')) }>{ key.get('name') }</button>
                    )
                    }
                </div>
                )
                : state === DECRYPTED
                ? (
                <div className="decryptedContainer">
                    <div className="decrypted">
                        <textarea id="decryptedText" value={ decrypted } disabled />
                        <button className="nobackground copyButton" onClick={ this.copy('decryptedText') }>
                            {
                            copySuccess
                            ? <i className="fa fa-check-circle"></i>
                            : copyFailed
                            ? <i className="fa fa-ban"></i>
                            : <i className="fa fa-copy"></i>
                            }
                        </button>
                    </div>
                    <button className="purple" onClick={ this.transitionTo(NONE) }>Back</button>
                </div>
                )
                : state === CIPHERTEXT
                ? (
                <div className="ciphertextContainer">
                    Vaelt cannot decrypt this message. The encrypted value is:
                    <div className="ciphertext">
                        <textarea id="ciphertextText" value={ ciphertext } disabled />
                        <button className="nobackground copyButton" onClick={ this.copy('ciphertextText') }>
                            {
                            copySuccess
                            ? <i className="fa fa-check-circle"></i>
                            : copyFailed
                            ? <i className="fa fa-ban"></i>
                            : <i className="fa fa-copy"></i>
                            }
                        </button>
                    </div>
                    <button className="purple" onClick={ this.transitionTo(NONE) }>Back</button>
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
                : state === PASSWORD_REQUIRED
                ? (
                <div>
                    Decrypt using { key.get('name') }:
                    <form className="secretForm">
                        <input name="password" type="password" placeholder="Password" value={ password } onChange={ this.handleInputChange }/>
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
                    <div className="textAndTimer">
                        Tap your Yubikey
                        <CircularTimer />
                    </div>
                </div>
                )
                : null
                }
                {
                vault.has('decryptionError')
                ? <div className="errorText">{ vault.getIn(['decryptionError', 'message']) }</div>
                : null
                }
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
)(Decrypt);
