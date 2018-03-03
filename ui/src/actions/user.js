import { jsonResponse, noContentResponse } from './parseResponse';

export const FETCH_USER_REQUEST = 'FETCH_USER_REQUEST';
function requestUser() {
    return {
        type: FETCH_USER_REQUEST,
    }
}

export const FETCH_USER_SUCCESS = 'FETCH_USER_SUCCESS';
function receiveUserSuccess(user) {
    return {
        type: FETCH_USER_SUCCESS,
        user,
        receivedAt: Date.now(),
    }
}

export const FETCH_USER_FAILURE = 'FETCH_USER_FAILURE';
function receiveUserFailure(error) {
    return {
        type: FETCH_USER_FAILURE,
        error,
    }
}

export function fetchUserIfNeeded() {
    return function(dispatch, getState) {
        const { user } = getState();
        if (user.get('isFetching') || user.get('receivedAt')) {
            return Promise.resolve();
        }

        dispatch(requestUser());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        return fetch("/api/users", {
            method: 'GET',
            credentials: 'same-origin',
            headers: headers,
        })
            .then(
                jsonResponse(dispatch, receiveUserSuccess, receiveUserFailure)
            );
    };
}

export const FETCH_LOGOUT_REQUEST = 'FETCH_LOGOUT_REQUEST';
function requestLogout() {
    return {
        type: FETCH_LOGOUT_REQUEST,
    }
}

export const FETCH_LOGOUT_SUCCESS = 'FETCH_LOGOUT_SUCCESS';
function receiveLogoutSuccess() {
    return {
        type: FETCH_LOGOUT_SUCCESS,
    }
}

export const FETCH_LOGOUT_FAILURE = 'FETCH_LOGOUT_FAILURE';
function receiveLogoutFailure(error) {
    return {
        type: FETCH_LOGOUT_FAILURE,
        error,
    }
}

export function logout() {
    return function(dispatch) {
        dispatch(requestLogout());

        return fetch("/api/logout", {
            method: 'GET',
            credentials: 'same-origin',
        })
            .then(
                noContentResponse(dispatch, receiveLogoutSuccess, receiveLogoutFailure)
            );
    };
}
