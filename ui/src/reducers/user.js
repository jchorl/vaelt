import { Map } from "immutable";
import { FETCH_LOGIN_SUCCESS } from "../actions/login";
import { FETCH_REGISTER_FINISH_SUCCESS } from "../actions/u2f";
import {
  FETCH_LOGOUT_SUCCESS,
  FETCH_USER_REQUEST,
  FETCH_USER_SUCCESS,
  FETCH_USER_FAILURE,
} from "../actions/user";
import { FETCH_SIGN_FINISH_SUCCESS, REQUIRE_U2F_SUCCESS } from "../actions/u2f";

const defaultState = Map({
  isFetching: false,
});
export default function user(state = defaultState, action) {
  switch (action.type) {
    case FETCH_USER_REQUEST:
      return state.set("isFetching", true);
    case FETCH_SIGN_FINISH_SUCCESS: // signing u2f completes a login
    case REQUIRE_U2F_SUCCESS: // requiring u2f returns an updated user
    case FETCH_USER_SUCCESS:
    case FETCH_LOGIN_SUCCESS:
      return Map({
        user: action.user,
        receivedAt: action.receivedAt,
        isFetching: false,
      });
    case FETCH_REGISTER_FINISH_SUCCESS:
      return state.setIn(["user", "u2fEnforced"], true);
    case FETCH_USER_FAILURE:
      return defaultState.set("error", action.error);
    case FETCH_LOGOUT_SUCCESS:
      return defaultState;
    default:
      return state;
  }
}
