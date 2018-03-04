import { Map } from 'immutable';
import { FETCH_LOGIN_SUCCESS } from '../actions/login';
import {
    FETCH_LOGOUT_SUCCESS,
    FETCH_USER_REQUEST,
    FETCH_USER_SUCCESS,
    FETCH_USER_FAILURE,
} from '../actions/user';

const defaultState = Map({
    isFetching: false,
});
export default function user(state = defaultState, action) {
    switch (action.type) {
        case FETCH_USER_REQUEST:
            return state.set('isFetching', true);
        case FETCH_USER_SUCCESS:
        case FETCH_LOGIN_SUCCESS:
            return Map({
                user: action.user,
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_USER_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state
    }
}
