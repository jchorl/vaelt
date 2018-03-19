import { Map } from "immutable";
import {
  FETCH_REGISTER_REQUEST,
  FETCH_REGISTER_SUCCESS,
  FETCH_REGISTER_FAILURE,
} from "../actions/register";
import { FETCH_LOGOUT_SUCCESS } from "../actions/user";

const defaultState = Map({
  isFetching: false,
});
export default function register(state = defaultState, action) {
  switch (action.type) {
    case FETCH_REGISTER_REQUEST:
      return state.set("isFetching", true);
    case FETCH_REGISTER_SUCCESS:
      return state.merge({
        receivedAt: action.receivedAt,
        isFetching: false,
      });
    case FETCH_REGISTER_FAILURE:
      return defaultState.set("error", action.error);
    case FETCH_LOGOUT_SUCCESS:
      return defaultState;
    default:
      return state;
  }
}
