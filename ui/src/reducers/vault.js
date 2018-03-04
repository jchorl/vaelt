import { Map, List } from 'immutable';
import {
    FETCH_VAULT_ALL_REQUEST,
    FETCH_VAULT_ALL_SUCCESS,
    FETCH_VAULT_ALL_FAILURE,
} from '../actions/vault';
import { FETCH_LOGOUT_SUCCESS } from '../actions/user';

const defaultState = Map({
    isFetching: false,
    entries: List(),
});
export default function vault(state = defaultState, action) {
    switch (action.type) {
        case FETCH_VAULT_ALL_REQUEST:
            return state.set('isFetching', true);
        case FETCH_VAULT_ALL_SUCCESS:
            return state.merge({
                entries: action.entries,
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_VAULT_ALL_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state
    }
}
