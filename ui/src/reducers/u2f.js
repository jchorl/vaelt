import { Map } from 'immutable';
import {
    FETCH_REGISTER_CHALLENGE_REQUEST,
    FETCH_REGISTER_CHALLENGE_SUCCESS,
    FETCH_REGISTER_CHALLENGE_FAILURE,
    FETCH_REGISTER_FINISH_REQUEST,
    FETCH_REGISTER_FINISH_SUCCESS,
    FETCH_REGISTER_FINISH_FAILURE,
} from '../actions/u2f';
import { FETCH_LOGOUT_SUCCESS } from '../actions/user';

const defaultRegisterState = Map({
    isFetching: false,
});

function register(state = defaultRegisterState, action) {
    switch (action.type) {
        case FETCH_REGISTER_CHALLENGE_REQUEST:
            return defaultRegisterState.set('isFetching', true);
        case FETCH_REGISTER_CHALLENGE_SUCCESS:
            return Map({
                challenge: action.challenge,
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_REGISTER_CHALLENGE_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_REGISTER_FINISH_REQUEST:
            return state;
        case FETCH_REGISTER_FINISH_SUCCESS:
            return defaultState.merge({
                complete: true,
                receivedAt: action.receivedAt,
            });
        case FETCH_REGISTER_FINISH_FAILURE:
            return defaultState.set('error', action.error);
        default:
            return state
    }
}

const defaultState = Map({
    register: defaultRegisterState,
});

export default function u2f(state = defaultState, action) {
    switch (action.type) {
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state.merge({
                register: register(state.get('register'), action),
            })
    }
}
