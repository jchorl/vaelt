import { jsonResponse, noContentResponse, reqFailure } from "./parseResponse";

export const FETCH_USER_REQUEST = "FETCH_USER_REQUEST";
function requestUser() {
  return {
    type: FETCH_USER_REQUEST,
  };
}

export const FETCH_USER_SUCCESS = "FETCH_USER_SUCCESS";
function receiveUserSuccess(user) {
  return {
    type: FETCH_USER_SUCCESS,
    user,
    receivedAt: Date.now(),
  };
}

export const FETCH_USER_FAILURE = "FETCH_USER_FAILURE";
function receiveUserFailure(error) {
  return {
    type: FETCH_USER_FAILURE,
    error,
  };
}

export function fetchUserIfNeeded() {
  return function(dispatch, getState) {
    const { user } = getState();
    if (user.get("isFetching") || user.get("receivedAt")) {
      return Promise.resolve();
    }

    dispatch(requestUser());

    let headers = new Headers();
    headers.append("Accept", "application/json");
    return fetch("/api/users", {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
    }).then(
      jsonResponse(dispatch, receiveUserSuccess, receiveUserFailure),
      reqFailure(dispatch, receiveUserFailure)
    );
  };
}

export const RESEND_VERIFICATION_SUCCESS = "RESEND_VERIFICATION_SUCCESS";
function resendVerificationSuccess() {
  return {
    type: RESEND_VERIFICATION_SUCCESS,
  };
}

export const RESEND_VERIFICATION_FAILURE = "RESEND_VERIFICATION_FAILURE";
function resendVerificationFailure(error) {
  return {
    type: RESEND_VERIFICATION_FAILURE,
    error,
  };
}

export function resendVerificationEmail() {
  return function(dispatch) {
    return fetch("/api/users/verify/resend", {
      method: "POST",
      credentials: "same-origin",
    }).then(
      noContentResponse(
        dispatch,
        resendVerificationSuccess,
        resendVerificationFailure
      ),
      reqFailure(dispatch, resendVerificationFailure)
    );
  };
}

export const FETCH_LOGOUT_REQUEST = "FETCH_LOGOUT_REQUEST";
function requestLogout() {
  return {
    type: FETCH_LOGOUT_REQUEST,
  };
}

export const FETCH_LOGOUT_SUCCESS = "FETCH_LOGOUT_SUCCESS";
function receiveLogoutSuccess() {
  return {
    type: FETCH_LOGOUT_SUCCESS,
  };
}

export const FETCH_LOGOUT_FAILURE = "FETCH_LOGOUT_FAILURE";
function receiveLogoutFailure(error) {
  return {
    type: FETCH_LOGOUT_FAILURE,
    error,
  };
}

export function logout() {
  return function(dispatch) {
    dispatch(requestLogout());

    return fetch("/api/logout", {
      method: "GET",
      credentials: "same-origin",
    }).then(
      noContentResponse(dispatch, receiveLogoutSuccess, receiveLogoutFailure),
      reqFailure(dispatch, receiveLogoutFailure)
    );
  };
}
