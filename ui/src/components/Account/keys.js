import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { addKey, fetchKeysIfNeeded, revokeKey } from '../../actions/keys';
import { getPublicKey } from '../../yubikey';
import './keys.css';

const NONE = Symbol("NONE");
const ADD_FROM_YUBIKEY = Symbol("ADD_FROM_YUBIKEY");

class Keys extends Component {
    static propTypes = {
        addKey: PropTypes.func.isRequired,
        fetchKeysIfNeeded: PropTypes.func.isRequired,
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
        };
    }

    componentWillMount() {
        this.props.fetchKeysIfNeeded();
    }

    componentWillReceiveProps(nextProps) {
        // add key success
        if (nextProps.keys.get('keys').size > this.props.keys.get('keys').size) {
            this.transitionTo(NONE)();
            this.setState({ name: '' });
        }
    }

    addFromYubikey = async () => {
        const url = await getPublicKey();
        const { name } = this.state;
        const key = {
            name,
            url,
            type: 'public',
        };
        this.props.addKey(key);
    }

    transitionTo = state => () => {
        this.setState({ state });
    }

    revoke = id => () => {
        this.props.revokeKey(id);
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
        const { state, name } = this.state;
        const { keys } = this.props;
        const publicKeys = keys.get('keys').filter(k => k.get('type') === 'public');
        return (
            <div className="keys">
                <h2>Keys</h2>
                <div className="greyBox">
                    <div className="table">
                        {
                        publicKeys.map(k => (
                        <div key={ k.get('id') } className="tableEntry">
                            <div className="keyName">{ k.get('name') }</div>
                            <div className="keyCreatedAt">{ k.get('createdAt').toLocaleDateString() }</div>
                            <button className="danger keyRevoke" onClick={ this.revoke(k.get('id')) } >Revoke</button>
                        </div>
                        ))
                        }
                    </div>
                    {
                    state === NONE
                    ? (
                    <div>
                        <button className="purple" onClick={ this.transitionTo(ADD_FROM_YUBIKEY) }>Add From Yubikey</button>
                        <button className="purple" onClick={ this.addFromYubikey }>Add From URL</button>
                    </div>
                    )
                    : state === ADD_FROM_YUBIKEY
                    ? (
                    <div>
                        Add from Yubikey
                        <div className="nameForm">
                            <input type="text" name="name" placeholder="Name" onChange={ this.handleInputChange } value={ name }/>
                            <div>
                                <button className="nobackground" onClick={ this.transitionTo(NONE) }>Cancel</button>
                                <button className="purple" onClick={ this.addFromYubikey }>Add</button>
                            </div>
                        </div>
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
        addKey: key => dispatch(addKey(key)),
        revokeKey: id => dispatch(revokeKey(id)),
    }),
)(Keys);
