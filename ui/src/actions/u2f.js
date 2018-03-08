import { jsonResponse, noContentResponse } from './parseResponse';

export const FETCH_REGISTER_CHALLENGE_REQUEST = 'FETCH_REGISTER_CHALLENGE_REQUEST';
function requestRegisterChallenge() {
    return {
        type: FETCH_REGISTER_CHALLENGE_REQUEST,
    }
}

export const FETCH_REGISTER_CHALLENGE_SUCCESS = 'FETCH_REGISTER_CHALLENGE_SUCCESS';
function receiveRegisterChallengeSuccess(challenge) {
    return {
        type: FETCH_REGISTER_CHALLENGE_SUCCESS,
        challenge,
        receivedAt: Date.now(),
    }
}

export const FETCH_REGISTER_CHALLENGE_FAILURE = 'FETCH_REGISTER_CHALLENGE_FAILURE';
function receiveRegisterChallengeFailure(error) {
    return {
        type: FETCH_REGISTER_CHALLENGE_FAILURE,
        error,
    }
}

export function fetchRegisterChallenge() {
    return function(dispatch) {
        dispatch(requestRegisterChallenge());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        fetch("/api/u2f/register", {
            method: 'GET',
            credentials: 'same-origin',
            headers,
        })
            .then(
                jsonResponse(dispatch, receiveRegisterChallengeSuccess, receiveRegisterChallengeFailure)
            );
    };
}

export const FETCH_REGISTER_FINISH_REQUEST = 'FETCH_REGISTER_FINISH_REQUEST';
function requestRegisterFinish() {
    return {
        type: FETCH_REGISTER_FINISH_REQUEST,
    }
}

export const FETCH_REGISTER_FINISH_SUCCESS = 'FETCH_REGISTER_FINISH_SUCCESS';
function receiveRegisterFinishSuccess() {
    return {
        type: FETCH_REGISTER_FINISH_SUCCESS,
        receivedAt: Date.now(),
    }
}

export const FETCH_REGISTER_FINISH_FAILURE = 'FETCH_REGISTER_FINISH_FAILURE';
function receiveRegisterFinishFailure(error) {
    return {
        type: FETCH_REGISTER_FINISH_FAILURE,
        error,
    }
}

export function fetchRegisterFinish(resp) {
    return function(dispatch) {
        dispatch(requestRegisterFinish());

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/u2f/register", {
            credentials: 'same-origin',
            method: 'POST',
            body: JSON.stringify(resp),
            headers,
        })
            .then(
                noContentResponse(dispatch, receiveRegisterFinishSuccess, receiveRegisterFinishFailure)
            );
    };
}
