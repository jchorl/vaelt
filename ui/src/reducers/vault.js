import { Map, OrderedMap } from 'immutable';
import {
    FETCH_VAULT_ALL_REQUEST,
    FETCH_VAULT_ALL_SUCCESS,
    FETCH_VAULT_ALL_FAILURE,
    ADD_TO_VAULT_SUCCESS,
    ADD_TO_VAULT_FAILURE,
} from '../actions/vault';
import { FETCH_LOGOUT_SUCCESS } from '../actions/user';

const defaultState = Map({
    isFetching: false,
    entries: OrderedMap(),
});
export default function vault(state = defaultState, action) {
    switch (action.type) {
        case FETCH_VAULT_ALL_REQUEST:
            return state.set('isFetching', true);
        case ADD_TO_VAULT_SUCCESS:
            state = state.set('lastAdded', action.entries.get(0).get('title'));
            // fall through
        case FETCH_VAULT_ALL_SUCCESS:
            return state.merge({
                // entries need to be keyed by title
                entries: state.get('entries').merge(action.entries.groupBy(e => e.get('title'))),
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case FETCH_VAULT_ALL_FAILURE:
            return defaultState.set('error', action.error);
        case ADD_TO_VAULT_FAILURE:
            return state.set('error', action.error);
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state
    }
}
