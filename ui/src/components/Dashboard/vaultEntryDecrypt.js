import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { fetchKeysForVaultEntryIfNeeded } from '../../actions/keys';
import { decrypt } from '../../actions/vault';
import CircularTimer from '../CircularTimer';
import './vaultEntryDecrypt.css';

const NONE = Symbol('NONE');
const PIN_REQUIRED = Symbol('PIN_REQUIRED');
const PASSWORD_REQUIRED = Symbol('PASSWORD_REQUIRED');
const TAP_REQUIRED = Symbol('TAP_REQUIRED');
const DECRYPTED = Symbol('DECRYPTED');

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

        const keyKeys = vault.getIn(['entries', title]).map(e => e.get('key'));
        fetchKeysForVaultEntryIfNeeded(title, keyKeys);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.title !== nextProps.title) {
            const keyKeys = nextProps.vault.getIn(['entries', nextProps.title]).map(e => e.get('key'));
            nextProps.fetchKeysForVaultEntryIfNeeded(nextProps.title, keyKeys);

            this.state = {
                decrypted: '',
                password: '',
                pin: '',
                state: NONE,
            };
        }

        if (
            !this.props.vault.get('yubikeyTapRequired') &&
            nextProps.vault.get('yubikeyTapRequired')
        ) {
            this.setState({ state: TAP_REQUIRED });
            return;
        }

        if (
            !this.props.vault.has('decryptionError') &&
            nextProps.vault.has('decryptionError')
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
                this.setState({
                    state: PASSWORD_REQUIRED,
                    key,
                });
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
                pin: '',
                password: '',
                copySuccess: false,
                copyFailed: false,
            });
            setTimeout(() => {
                this.setState({
                    decrypted: '',
                    state: NONE,
                });
            }, 30 * 1000);
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

    copy = () => {
        const { decrypted } = this.state;
        if (!!navigator.clipboard) {
            return navigator.clipboard.writeText(decrypted).then(
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

        const copyTextarea = document.getElementById('decryptedText');
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

    render() {
        const {
            state,
            key,
            pin,
            password,
            decrypted,
            copySuccess,
            copyFailed,
        } = this.state;
        const { title, vault } = this.props;
        const encryptingKeys = vault.getIn(['titleToKeys', title], List());

        return (
            <div className="greyContainer vaultEntryDecrypt">
                {
                state === NONE
                ? (
                <div>
                    <div>
                        Decrypt
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
                <div className="decryptedContainer">
                    Decrypted:
                    <div className="decrypted">
                        <textarea id="decryptedText" value={ decrypted } disabled />
                        <button className="nobackground" onClick={ this.copy }>
                            {
                            copySuccess
                            ? <i className="fa fa-check-circle"></i>
                            : copyFailed
                            ? <i className="fa fa-ban"></i>
                            : <i className="fa fa-copy"></i>
                            }
                        </button>
                    </div>
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
