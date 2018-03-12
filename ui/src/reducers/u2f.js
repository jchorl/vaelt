import { List, Map } from 'immutable';
import {
    FETCH_REGISTER_CHALLENGE_REQUEST,
    FETCH_REGISTER_CHALLENGE_SUCCESS,
    FETCH_REGISTER_CHALLENGE_FAILURE,
    FETCH_REGISTER_FINISH_REQUEST,
    FETCH_REGISTER_FINISH_SUCCESS,
    FETCH_REGISTER_FINISH_FAILURE,
    FETCH_REGISTRATIONS_REQUEST,
    FETCH_REGISTRATIONS_SUCCESS,
    FETCH_REGISTRATIONS_FAILURE,
    FETCH_DELETE_REGISTRATION_SUCCESS,
    FETCH_DELETE_REGISTRATION_FAILURE,
    FETCH_SIGN_CHALLENGE_REQUEST,
    FETCH_SIGN_CHALLENGE_SUCCESS,
    FETCH_SIGN_CHALLENGE_FAILURE,
    FETCH_SIGN_FINISH_REQUEST,
    FETCH_SIGN_FINISH_SUCCESS,
    FETCH_SIGN_FINISH_FAILURE,
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

const defaultSignState = Map({
    isFetching: false,
});

function sign(state = defaultSignState, action) {
    switch (action.type) {
        case FETCH_SIGN_CHALLENGE_REQUEST:
            return defaultSignState.set('isFetching', true);
        case FETCH_SIGN_CHALLENGE_SUCCESS:
            return Map({
                challenge: action.challenge,
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_SIGN_CHALLENGE_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_SIGN_FINISH_REQUEST:
            return state;
        case FETCH_SIGN_FINISH_SUCCESS:
            return defaultState.merge({
                complete: true,
                receivedAt: action.receivedAt,
            });
        case FETCH_SIGN_FINISH_FAILURE:
            return defaultState.set('error', action.error);
        default:
            return state
    }
}

const defaultRegistrationsState = Map({
    isFetching: false,
    registrations: List(),
});

function registrations(state = defaultRegistrationsState, action) {
    switch (action.type) {
        case FETCH_REGISTRATIONS_REQUEST:
            return defaultRegistrationsState.set('isFetching', true);
        case FETCH_REGISTRATIONS_SUCCESS:
            return Map({
                registrations: action.registrations
                    .map(r => r.update('createdAt', c => new Date(c)))
                    .sort((r1, r2) => r1.get('createdAt') < r2.get('createdAt')),
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_REGISTER_FINISH_SUCCESS: {
            const registration = action.registration.update('createdAt', c => new Date(c));
            return state.update('registrations',
                registrations => registrations.push(registration).sort((r1, r2) => r1.get('createdAt') < r2.get('createdAt'))
            );
        }
        case FETCH_REGISTRATIONS_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_DELETE_REGISTRATION_SUCCESS:
            return state.update('registrations', registrations => registrations.filter(r => r.get('id') !== action.id));
        case FETCH_DELETE_REGISTRATION_FAILURE:
            return defaultState.set('error', action.error);
        default:
            return state
    }
}

const defaultState = Map({
    register: defaultRegisterState,
    sign: defaultSignState,
    registrations: defaultRegistrationsState,
});

export default function u2f(state = defaultState, action) {
    switch (action.type) {
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state.merge({
                register: register(state.get('register'), action),
                registrations: registrations(state.get('registrations'), action),
                sign: sign(state.get('sign'), action),
            })
    }
}
