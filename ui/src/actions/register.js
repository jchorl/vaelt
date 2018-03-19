import { noContentResponse, reqFailure } from "./parseResponse";

export const FETCH_REGISTER_REQUEST = "FETCH_REGISTER_REQUEST";
function requestRegister() {
  return {
    type: FETCH_REGISTER_REQUEST,
  };
}

export const FETCH_REGISTER_SUCCESS = "FETCH_REGISTER_SUCCESS";
function receiveRegisterSuccess() {
  return {
    type: FETCH_REGISTER_SUCCESS,
    receivedAt: Date.now(),
  };
}

export const FETCH_REGISTER_FAILURE = "FETCH_REGISTER_FAILURE";
function receiveRegisterFailure(error) {
  return {
    type: FETCH_REGISTER_FAILURE,
    error,
  };
}

export function register(email, password, keys) {
  return function(dispatch) {
    dispatch(requestRegister());

    let headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(email + ":" + password));
    headers.append("Content-Type", "application/json");
    return fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(keys),
      credentials: "same-origin",
      headers: headers,
    }).then(
      noContentResponse(
        dispatch,
        receiveRegisterSuccess,
        receiveRegisterFailure
      ),
      reqFailure(dispatch, receiveRegisterFailure)
    );
  };
}
