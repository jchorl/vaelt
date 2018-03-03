import { noContentResponse } from './parseResponse';

export const FETCH_REGISTER_REQUEST = 'FETCH_REGISTER_REQUEST';
function requestRegister() {
    return {
        type: FETCH_REGISTER_REQUEST,
    }
}

export const FETCH_REGISTER_SUCCESS = 'FETCH_REGISTER_SUCCESS';
function receiveRegisterSuccess() {
    return {
        type: FETCH_REGISTER_SUCCESS,
        receivedAt: Date.now(),
    }
}

export const FETCH_REGISTER_FAILURE = 'FETCH_REGISTER_FAILURE';
function receiveRegisterFailure(error) {
    return {
        type: FETCH_REGISTER_FAILURE,
        error,
    }
}

export function register(email, password) {
    return function(dispatch) {
        dispatch(requestRegister());

        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(email + ":" + password));
        return fetch("/api/users", {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
        })
            .then(
                noContentResponse(dispatch, receiveRegisterSuccess, receiveRegisterFailure)
            );
    };
}
