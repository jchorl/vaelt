import { jsonResponse, reqFailure } from "./parseResponse";

export const FETCH_LOGIN_REQUEST = "FETCH_LOGIN_REQUEST";
function requestLogin() {
  return {
    type: FETCH_LOGIN_REQUEST,
  };
}

export const FETCH_LOGIN_SUCCESS = "FETCH_LOGIN_SUCCESS";
function receiveLoginSuccess(user) {
  return {
    type: FETCH_LOGIN_SUCCESS,
    user,
    receivedAt: Date.now(),
  };
}

export const FETCH_LOGIN_FAILURE = "FETCH_LOGIN_FAILURE";
function receiveLoginFailure(error) {
  return {
    type: FETCH_LOGIN_FAILURE,
    error,
  };
}

export function login(email, password) {
  return function(dispatch) {
    dispatch(requestLogin());

    let headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(email + ":" + password));
    return fetch("/api/users/login", {
      method: "POST",
      credentials: "same-origin",
      headers: headers,
    }).then(
      jsonResponse(dispatch, receiveLoginSuccess, receiveLoginFailure),
      reqFailure(dispatch, receiveLoginFailure)
    );
  };
}
