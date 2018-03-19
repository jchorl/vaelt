import { Map, OrderedMap } from 'immutable';
import {
    FETCH_VAULT_ALL_REQUEST,
    FETCH_VAULT_ALL_SUCCESS,
    FETCH_VAULT_ALL_FAILURE,
    ADD_TO_VAULT_SUCCESS,
    ADD_TO_VAULT_FAILURE,
    UPDATE_VAULT_SUCCESS,
    UPDATE_VAULT_FAILURE,
    DECRYPTION_SUCCESS,
    DECRYPTION_FAILURE,
    YUBIKEY_TAP_REQUIRED,
    DELETE_BY_TITLE_REQUEST,
    DELETE_BY_TITLE_SUCCESS,
    DELETE_BY_TITLE_FAILURE,
} from '../actions/vault';
import {
    REVOKE_KEY_SUCCESS,
    FETCH_KEYS_FOR_VAULT_ENTRY_SUCCESS,
    FETCH_KEYS_FOR_VAULT_ENTRY_FAILURE,
    FETCH_PASSWORD_PRIVATE_KEY_FAILURE,
} from '../actions/keys';
import { FETCH_LOGOUT_SUCCESS } from '../actions/user';

const defaultState = Map({
    isFetching: false,
    yubikeyTapRequired: false,
    entries: OrderedMap(),
    titleToKeys: Map(),
});
export default function vault(state = defaultState, action) {
    switch (action.type) {
        case FETCH_VAULT_ALL_REQUEST:
            return state.set('isFetching', true);
        case UPDATE_VAULT_SUCCESS:
        case ADD_TO_VAULT_SUCCESS:
            state = state
                .set('lastAdded', action.entries.get(0).get('title'))
                .delete('error')
                .delete('updateError');
            // fall through
        case FETCH_VAULT_ALL_SUCCESS:
            return state.merge({
                // entries need to be keyed by title
                entries: state.get('entries')
                .valueSeq()
                .flatten(true)
                .concat(action.entries)
                .toList()
                .groupBy(e => e.get('title')),
                receivedAt: action.receivedAt,
                isFetching: false,
            });
        case REVOKE_KEY_SUCCESS:
            return state.update(
                'entries',
                entries => entries
                .valueSeq()
                .flatten(true)
                .filter(e => e.get('key') !== action.id)
                .toList()
                .groupBy(e => e.get('title'))
            );
        case DELETE_BY_TITLE_SUCCESS:
            return state
                .deleteIn(['entries', action.title])
                .delete(action.taskID)
                .deleteIn(['titleToKeys', action.title]);
        case DELETE_BY_TITLE_REQUEST:
            return state.set(action.taskID, Map());
        case DELETE_BY_TITLE_FAILURE:
            return state.setIn([action.taskID, 'error'], action.error);
        case YUBIKEY_TAP_REQUIRED:
            return state.setIn([action.taskID, 'yubikeyTapRequired'], true);
        case FETCH_VAULT_ALL_FAILURE:
            return defaultState.set('error', action.error);
        case FETCH_KEYS_FOR_VAULT_ENTRY_SUCCESS:
            return state.setIn(['titleToKeys', action.title], action.keys);
        case DECRYPTION_SUCCESS:
            return state.set(action.taskID, Map());
        case FETCH_PASSWORD_PRIVATE_KEY_FAILURE:
        case DECRYPTION_FAILURE:
            return state.setIn([action.error.get('taskID'), 'error'], action.error);
        case FETCH_KEYS_FOR_VAULT_ENTRY_FAILURE:
        case ADD_TO_VAULT_FAILURE:
            return state.set('error', action.error);
        case UPDATE_VAULT_FAILURE:
            return state.set('updateError', action.error);
        case FETCH_LOGOUT_SUCCESS:
            return defaultState;
        default:
            return state
    }
}
