import { Map } from 'immutable';
import {
    FETCH_LOGIN_REQUEST,
    FETCH_LOGIN_SUCCESS,
    FETCH_LOGIN_FAILURE,
} from '../actions/login';
import { FETCH_LOGOUT_SUCCESS } from '../actions/user';

const defaultState = Map({
    isFetching: false,
});
export default function login(state = defaultState, action) {
    switch (action.type) {
        case FETCH_LOGIN_REQUEST:
            return state.set('isFetching', true);
        case FETCH_LOGIN_SUCCESS:
            return state.merge({
                user: action.user,
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_LOGIN_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state
    }
}
