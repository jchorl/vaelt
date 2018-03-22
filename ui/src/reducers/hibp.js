import { Map } from "immutable";
import { HIBP_FAILURE, HIBP_SUCCESS } from "../actions/hibp";

const defaultState = Map();
export default function hibp(state = defaultState, action) {
  switch (action.type) {
    case HIBP_FAILURE:
      return state.set("error", action.error);
    case HIBP_SUCCESS:
      return state.delete("error");
    default:
      return state;
  }
}
