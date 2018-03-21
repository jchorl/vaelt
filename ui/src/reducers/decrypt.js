import { Map } from "immutable";
import {
  DECRYPTION_REQUEST,
  DECRYPTION_SUCCESS,
  DECRYPTION_FAILURE,
  YUBIKEY_TAP_REQUIRED,
} from "../actions/decrypt";

const defaultState = Map();
export default function decrypt(state = defaultState, action) {
  switch (action.type) {
    case DECRYPTION_REQUEST:
      return state.set(action.taskID, Map());
    case YUBIKEY_TAP_REQUIRED:
      return state.setIn([action.taskID, "yubikeyTapRequired"], true);
    case DECRYPTION_SUCCESS:
      return state.set(action.taskID, Map());
    case DECRYPTION_FAILURE:
      return state.setIn([action.error.get("taskID"), "error"], action.error);
    default:
      return state;
  }
}
