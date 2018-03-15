/* global u2f */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { checkError } from './util';
import { fetchRegisterChallenge, fetchRegisterFinish } from '../../actions/u2f';
import CircularTimer from '../CircularTimer';
import './u2f.css';

const NOT_STARTED = Symbol('NOT_STARTED');
const TAP_REQUIRED = Symbol('TAP_REQUIRED');
const TAP_EXPIRED = Symbol('TAP_EXPIRED');
const DEVICE_INELIGIBLE = Symbol('DEVICE_INELIGIBLE');
const FAILED = Symbol('FAILED');

class RegisterU2F extends Component {
    static propTypes = {
        fetchRegisterChallenge: PropTypes.func.isRequired,
        fetchRegisterFinish: PropTypes.func.isRequired,
        u2f: ImmutablePropTypes.contains({
            challenge: ImmutablePropTypes.contains({
                appId: PropTypes.string.isRequired,
                registerRequests: ImmutablePropTypes.list.isRequired,
                registeredKeys: ImmutablePropTypes.list,
            }),
        }).isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            state: NOT_STARTED,
        }
    }

    componentWillReceiveProps(nextProps) {
        // if there is a new challenge
        if (nextProps.u2f.has('challenge') && this.props.u2f.get('challenge') !== nextProps.u2f.get('challenge')) {
            const challenge = nextProps.u2f.get('challenge');
            this.challengeReceived(challenge);
        } else if (nextProps.u2f.has('error') && this.state.state !== FAILED) {
            this.setState({ state: FAILED });
        } else if (nextProps.u2f.has('complete')) {
            this.setState({ state: NOT_STARTED });
        }
    }

    challengeReceived = challenge => {
        u2f.register(challenge.get('appId'), challenge.get('registerRequests'), challenge.get('registeredKeys'), this.responseReceived, 30);
        this.setState({ state: TAP_REQUIRED });
    }

    responseReceived = resp => {
        if (checkError(resp)) {
            if (resp.errorCode === u2f.ErrorCodes.TIMEOUT) {
                this.setState({ state: TAP_EXPIRED });
            } else if (resp.errorCode === u2f.ErrorCodes.DEVICE_INELIGIBLE) {
                this.setState({ state: DEVICE_INELIGIBLE });
            } else {
                this.setState({ state: FAILED });
            }
            return;
        }

        const { fetchRegisterFinish } = this.props;
        fetchRegisterFinish(resp);
    }

    render() {
        const { state } = this.state;
        const { fetchRegisterChallenge } = this.props;

        return (
            <div className="u2f u2fRegister">
                {
                state === NOT_STARTED
                ? <button className="purple" onClick={ fetchRegisterChallenge }>Begin U2F Registration</button>
                : state === TAP_REQUIRED
                ? (
                <div className="tapStage">
                    <div>Tap your U2F device</div>
                    <CircularTimer />
                </div>
                )
                : state === TAP_EXPIRED
                ? (
                <div className="horizontalCenter">
                    <div>Time has expired</div>
                    <button className="retryButton nobackground" onClick={ fetchRegisterChallenge }>Try Again</button>
                </div>
                )
                : state === DEVICE_INELIGIBLE
                ? (
                <div className="horizontalCenter">
                    <div>Device is not eligible. It might already by registered.</div>
                    <button className="retryButton nobackground" onClick={ fetchRegisterChallenge }>Try Again</button>
                </div>
                )
                : state === FAILED
                ? (
                <div className="horizontalCenter">
                    <div>Something went wrong :(</div>
                    <button className="retryButton nobackground" onClick={ fetchRegisterChallenge }>Try Again</button>
                </div>
                )
                : null
                }
            </div>
            );
    }
}

export default connect(
    state => ({ u2f: state.u2f.get('register') }),
    dispatch => ({
        fetchRegisterChallenge: () => dispatch(fetchRegisterChallenge()),
        fetchRegisterFinish: resp => dispatch(fetchRegisterFinish(resp)),
    }),
)(RegisterU2F)
