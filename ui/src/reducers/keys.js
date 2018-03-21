import { List, Map } from "immutable";
import {
  FETCH_KEYS_REQUEST,
  FETCH_KEYS_SUCCESS,
  FETCH_KEYS_FAILURE,
  KEY_POST_SUCCESS,
  KEY_POST_FAILURE,
  REVOKE_KEY_SUCCESS,
  REVOKE_KEY_FAILURE,
  FETCH_KEY_BY_ID_FAILURE,
} from "../actions/keys";
import { REENCRYPTION_FAILURE } from "../actions/vault";
import { FETCH_LOGOUT_SUCCESS } from "../actions/user";

const defaultState = Map({
  keys: List(),
  isFetching: false,
});

export default function keys(state = defaultState, action) {
  switch (action.type) {
    case FETCH_LOGOUT_SUCCESS:
      return defaultState;
    case FETCH_KEYS_REQUEST:
      return state.set("isFetching", true);
    case KEY_POST_SUCCESS:
      return state.delete("error").update("keys", keys =>
        keys
          .concat(
            action.keys.map(k => {
              if (k.get("type") === "private") {
                k = k.set("armoredKey", "");
              }
              return k.update("createdAt", c => new Date(c));
            })
          )
          .sort(
            (k1, k2) =>
              k2.get("createdAt").getTime() - k1.get("createdAt").getTime()
          )
      );
    case FETCH_KEYS_SUCCESS:
      return Map({
        // strip out the private armored keys so they dont get stored
        // they can be fetched individually
        keys: action.keys
          .map(k => {
            if (k.get("type") === "private") {
              k = k.set("armoredKey", "");
            }
            return k.update("createdAt", c => new Date(c));
          })
          .sort(
            (k1, k2) =>
              k2.get("createdAt").getTime() - k1.get("createdAt").getTime()
          ),
        receivedAt: action.receivedAt,
      });
    case FETCH_KEY_BY_ID_FAILURE:
    case FETCH_KEYS_FAILURE:
      return defaultState.set("error", action.error);
    case REENCRYPTION_FAILURE:
    case KEY_POST_FAILURE:
    case REVOKE_KEY_FAILURE:
      return state.set("error", action.error);
    case REVOKE_KEY_SUCCESS:
      return state.update("keys", keys =>
        keys.filter(k => k.get("id") !== action.id)
      );
    default:
      return state;
  }
}
