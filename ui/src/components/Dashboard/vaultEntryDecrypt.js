import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { List } from 'immutable';
import classNames from 'classnames';
import { fetchKeysForVaultEntryIfNeeded } from '../../actions/keys';
import { decrypt } from '../../actions/vault';
import { uuidv4 } from '../../crypto';
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
            yubikeyTapRequired: PropTypes.bool.isRequired,
        }).isRequired,
        version: PropTypes.number,
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

        this.id = uuidv4();

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
            return;
        }

        if (this.getVersion(this.props) !== this.getVersion(nextProps)) {
            this.transitionTo(NONE)();
            return;
        }

        if (
            !this.props.vault.getIn([this.id, 'yubikeyTapRequired']) &&
            nextProps.vault.getIn([this.id, 'yubikeyTapRequired'])
        ) {
            this.transitionTo(TAP_REQUIRED)();
            return;
        }

        if (
            !this.props.vault.hasIn([this.id, 'error']) &&
            nextProps.vault.hasIn([this.id, 'error'])
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
                const version = this.getVersion(this.props);
                const ciphertext = vault
                    .getIn(['entries', title])
                    .filter(e => e.get('version') === version)
                    .find(e => e.get('key') === id)
                    .get('encryptedMessage');
                this.transitionTo(CIPHERTEXT)({ ciphertext });
        }
    }

    decrypt = async e => {
        e.preventDefault();

        const { decrypt, title, vault } = this.props;
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

        const version = this.getVersion(this.props);
        const ciphertext = vault
            .getIn(['entries', title])
            .filter(e => e.get('version') === version)
            .find(e => e.get('key') === key.get('id'))
            .get('encryptedMessage');

        try {
            const decrypted = await decrypt(key, ciphertext, secret, this.id);
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
        let copyTextarea = document.getElementById(elementId);
        if (!!this.state.decrypted) {
            copyText = this.state.decrypted;
        } else {
            copyText = this.state.ciphertext;
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

    getVersion = props => {
        let { vault, title, version } = props;

        if (!!version) {
            return version;
        }

        return Math.max(...vault.getIn(['entries', title]).map(e => e.get('version')).toJS());
    }

    getEncryptingKeys = () => {
        const { vault, title } = this.props;
        const version = this.getVersion(this.props);

        const keyIDs = vault.getIn(['entries', title])
            .filter(e => e.get('version') === version)
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
        const { vault, version } = this.props;

        const encryptingKeys = this.getEncryptingKeys();

        return (
            // if there is a version, dont put the greyContainer
            <div className={ classNames('vaultEntryDecrypt', { greyContainer: !version }) }>
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
                        <textarea id={ this.id } className="decryptedText" value={ decrypted } disabled />
                        <button className="nobackground copyButton" onClick={ this.copy(this.id) }>
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
                vault.hasIn([this.id, 'error'])
                ? <div className="errorText">{ vault.getIn([this.id, 'error', 'message']) }</div>
                : null
                }
            </div>
            );
    }
}

export default connect(
    state => ({ vault: state.vault }),
    dispatch => ({
        decrypt: (key, ciphertext, secret, id) => dispatch(decrypt(key, ciphertext, secret, id)),
        fetchKeysForVaultEntryIfNeeded: (title, keyKeys) => dispatch(fetchKeysForVaultEntryIfNeeded(title, keyKeys)),
    })
)(Decrypt);
