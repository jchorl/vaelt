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

export const FETCH_SIGN_CHALLENGE_REQUEST = 'FETCH_SIGN_CHALLENGE_REQUEST';
function requestSignChallenge() {
    return {
        type: FETCH_SIGN_CHALLENGE_REQUEST,
    }
}

export const FETCH_SIGN_CHALLENGE_SUCCESS = 'FETCH_SIGN_CHALLENGE_SUCCESS';
function receiveSignChallengeSuccess(challenge) {
    return {
        type: FETCH_SIGN_CHALLENGE_SUCCESS,
        challenge,
        receivedAt: Date.now(),
    }
}

export const FETCH_SIGN_CHALLENGE_FAILURE = 'FETCH_SIGN_CHALLENGE_FAILURE';
function receiveSignChallengeFailure(error) {
    return {
        type: FETCH_SIGN_CHALLENGE_FAILURE,
        error,
    }
}

export function fetchSignChallenge() {
    return function(dispatch) {
        dispatch(requestSignChallenge());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        fetch("/api/u2f/sign", {
            method: 'GET',
            credentials: 'same-origin',
            headers,
        })
            .then(
                jsonResponse(dispatch, receiveSignChallengeSuccess, receiveSignChallengeFailure)
            );
    };
}

export const FETCH_SIGN_FINISH_REQUEST = 'FETCH_SIGN_FINISH_REQUEST';
function requestSignFinish() {
    return {
        type: FETCH_SIGN_FINISH_REQUEST,
    }
}

export const FETCH_SIGN_FINISH_SUCCESS = 'FETCH_SIGN_FINISH_SUCCESS';
function receiveSignFinishSuccess(user) {
    return {
        type: FETCH_SIGN_FINISH_SUCCESS,
        user,
        receivedAt: Date.now(),
    }
}

export const FETCH_SIGN_FINISH_FAILURE = 'FETCH_SIGN_FINISH_FAILURE';
function receiveSignFinishFailure(error) {
    return {
        type: FETCH_SIGN_FINISH_FAILURE,
        error,
    }
}

export function fetchSignFinish(resp) {
    return function(dispatch) {
        dispatch(requestSignFinish());

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/u2f/sign", {
            credentials: 'same-origin',
            method: 'POST',
            body: JSON.stringify(resp),
            headers,
        })
            .then(
                jsonResponse(dispatch, receiveSignFinishSuccess, receiveSignFinishFailure)
            );
    };
}
