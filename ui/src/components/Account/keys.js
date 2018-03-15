import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import {
    addKey,
    fetchKeysIfNeeded,
    fetchKeyByID,
    revokeKey
} from '../../actions/keys';
import { getPublicKey } from '../../yubikey';
import './keys.css';

const NONE = Symbol('NONE');
const ADD_FROM_YUBIKEY = Symbol('ADD_FROM_YUBIKEY');
const ADD_FROM_URL = Symbol('ADD_FROM_URL');
const ADD_FROM_KEY = Symbol('ADD_FROM_KEY');

class Keys extends Component {
    static propTypes = {
        addKey: PropTypes.func.isRequired,
        fetchKeysIfNeeded: PropTypes.func.isRequired,
        fetchKeyByID: PropTypes.func.isRequired,
        revokeKey: PropTypes.func.isRequired,
        keys: ImmutablePropTypes.contains({
            keys: ImmutablePropTypes.listOf(
                ImmutablePropTypes.contains({
                    id: PropTypes.string.isRequired,
                    name: PropTypes.string.isRequired,
                    createdAt: PropTypes.instanceOf(Date).isRequired,
                }),
            ).isRequired,
            error: ImmutablePropTypes.contains({ message: PropTypes.string.isRequired }),
        }).isRequired,
        u2fEnforced: PropTypes.bool,
    }

    constructor(props) {
        super(props);
        this.state = {
            state: NONE,
            name: '',
            url: '',
            armoredKey: '',
        };
    }

    componentWillMount() {
        this.props.fetchKeysIfNeeded();
    }

    componentWillReceiveProps(nextProps) {
        // add key success
        if (nextProps.keys.get('keys').size > this.props.keys.get('keys').size) {
            this.transitionTo(NONE)();

            // reset name, url and armoredKey
            this.setState({ name: '', url: '', armoredKey: '' });
        }
    }

    addFromYubikey = async e => {
        e.preventDefault();

        const url = await getPublicKey();
        const { name } = this.state;
        const key = {
            name,
            url,
            type: 'public',
            device: 'yubikey',
        };
        this.props.addKey(key);
    }

    addFromURL = e => {
        e.preventDefault();

        const { name, url } = this.state;
        const key = {
            name,
            url,
            type: 'public',
            device: 'unknown',
        };
        this.props.addKey(key);
    }

    addFromArmoredKey = e => {
        e.preventDefault();

        const { name, armoredKey } = this.state;
        const key = {
            name,
            armoredKey,
            type: 'public',
            device: 'unknown',
        };
        this.props.addKey(key);
    }

    transitionTo = state => () => {
        this.setState({ state });
    }

    revoke = id => () => {
        this.props.revokeKey(id);
    }

    show = id => async () => {
        let key = this.props.keys.get('keys').find(v => v.get('id') === id);
        // if the key is a url, just open that url
        if (!!key.get('url')) {
            window.open(key.get('url'));
            return;
        } else if (!key.get('armoredKey')) {
            // private keys arent saved in redux
            key = await this.props.fetchKeyByID(key.get('id'));
        }
        // some hack to write the key in a new window/tab
        const x = window.open();
        if (!x) {
            alert('You might have popups blocked');
            return;
        }
        x.document.open();
        x.document.write('<pre>' + key.get('armoredKey') + '</pre>');
        x.document.close();
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
        const { state, name, url, armoredKey } = this.state;
        const { keys } = this.props;
        const allKeys = keys.get('keys');

        // TODO fix view when all keys are revoked
        // TODO encrypt all values with the new key if possible
        // TODO warn when revoking a key
        return (
            <div className="keys">
                <h2>Keys</h2>
                <div className="greyContainer">
                    <div className="table">
                        {
                        allKeys.map(k => (
                        <div key={ k.get('id') } className="tableEntry">
                            <div className="keyName">
                                { k.get('name') }
                                { k.get('type') === 'private' ? <span className="privateText"> (private)</span> : null }
                            </div>
                            <div className="keyCreatedAt">{ k.get('createdAt').toLocaleDateString() }</div>
                            <div className="keyButtons">
                                <button className="nobackground" onClick={ this.show(k.get('id')) } >Show</button>
                                <button className="danger" onClick={ this.revoke(k.get('id')) } >{ k.get('type') === 'public' ? 'Revoke' : 'Delete' }</button>
                            </div>
                        </div>
                        ))
                        }
                    </div>
                    {
                    state === NONE
                    ? (
                    <div>
                        <button className="purple" onClick={ this.transitionTo(ADD_FROM_YUBIKEY) }>Add From Yubikey</button>
                        <button className="purple" onClick={ this.transitionTo(ADD_FROM_URL) }>Add From URL</button>
                        <button className="purple" onClick={ this.transitionTo(ADD_FROM_KEY) }>Add From Armored Key</button>
                    </div>
                    )
                    : state === ADD_FROM_YUBIKEY
                    ? (
                    <div>
                        Add from Yubikey
                        <form className="nameForm">
                            <input type="text" name="name" placeholder="Name" onChange={ this.handleInputChange } value={ name }/>
                            <div>
                                <button type="button" className="nobackground" onClick={ this.transitionTo(NONE) }>Cancel</button>
                                <button type="submit" className="purple" onClick={ this.addFromYubikey }>Add</button>
                            </div>
                        </form>
                    </div>
                    )
                    : state === ADD_FROM_URL
                    ? (
                    <div>
                        Add from URL
                        <form className="nameUrlForm">
                            <div className="urlForm">
                                <input type="text" name="name" placeholder="Name" onChange={ this.handleInputChange } value={ name }/>
                                <input type="text" name="url" placeholder="URL" onChange={ this.handleInputChange } value={ url }/>
                            </div>
                            <div className="urlFormButtons">
                                <button type="button" className="nobackground" onClick={ this.transitionTo(NONE) }>Cancel</button>
                                <button type="submit" className="purple" onClick={ this.addFromURL }>Add</button>
                            </div>
                        </form>
                    </div>
                    )
                    : state === ADD_FROM_KEY
                    ? (
                    <div>
                        Add from Armored Key
                        <form className="nameKeyForm">
                            <div className="keyForm">
                                <input type="text" name="name" placeholder="Name" onChange={ this.handleInputChange } value={ name }/>
                                <textarea name="armoredKey" placeholder="Armored Key..." onChange={ this.handleInputChange } value={ armoredKey }/>
                            </div>
                            <div className="keyFormButtons">
                                <button type="button" className="nobackground" onClick={ this.transitionTo(NONE) }>Cancel</button>
                                <button type="submit" className="purple" onClick={ this.addFromArmoredKey }>Add</button>
                            </div>
                        </form>
                    </div>
                    )
                    : null
                    }
                    { keys.has('error')
                    ? (
                    <div className="errorText">
                        { keys.getIn(['error', 'message']) }
                    </div>
                    ) : null }
                </div>
            </div>
            );
    }
}

export default connect(
    state => ({ keys: state.keys }),
    dispatch => ({
        fetchKeysIfNeeded: () => dispatch(fetchKeysIfNeeded()),
        fetchKeyByID: id => dispatch(fetchKeyByID(id)),
        addKey: key => dispatch(addKey(key)),
        revokeKey: id => dispatch(revokeKey(id)),
    }),
)(Keys);
