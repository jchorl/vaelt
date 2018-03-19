import { jsonResponse, stringResponse, reqFailure } from './parseResponse';

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
                jsonResponse(dispatch, receiveRegisterChallengeSuccess, receiveRegisterChallengeFailure),
                reqFailure(dispatch, receiveRegisterChallengeFailure)
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
function receiveRegisterFinishSuccess(registration) {
    return {
        type: FETCH_REGISTER_FINISH_SUCCESS,
        registration,
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
                jsonResponse(dispatch, receiveRegisterFinishSuccess, receiveRegisterFinishFailure),
                reqFailure(dispatch, receiveRegisterFinishFailure)
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
                jsonResponse(dispatch, receiveSignChallengeSuccess, receiveSignChallengeFailure),
                reqFailure(dispatch, receiveSignChallengeFailure)
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
                jsonResponse(dispatch, receiveSignFinishSuccess, receiveSignFinishFailure),
                reqFailure(dispatch, receiveSignFinishFailure)
            );
    };
}

export const FETCH_REGISTRATIONS_REQUEST = 'FETCH_REGISTRATIONS_REQUEST';
function requestRegistrations() {
    return {
        type: FETCH_REGISTRATIONS_REQUEST,
    }
}

export const FETCH_REGISTRATIONS_SUCCESS = 'FETCH_REGISTRATIONS_SUCCESS';
function receiveRegistrationsSuccess(registrations) {
    return {
        type: FETCH_REGISTRATIONS_SUCCESS,
        registrations,
        receivedAt: Date.now(),
    }
}

export const FETCH_REGISTRATIONS_FAILURE = 'FETCH_REGISTRATIONS_FAILURE';
function receiveRegistrationsFailure(error) {
    return {
        type: FETCH_REGISTRATIONS_FAILURE,
        error,
    }
}

export function fetchRegistrationsIfNeeded() {
    return function(dispatch, getState) {
        const { u2f } = getState();
        if (u2f.getIn(['registrations', 'receivedAt']) || u2f.getIn(['registrations', 'isFetching'])) {
            return Promise.resolve();
        }

        dispatch(requestRegistrations());

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/u2f/registrations", {
            credentials: 'same-origin',
            method: 'GET',
            headers,
        })
            .then(
                jsonResponse(dispatch, receiveRegistrationsSuccess, receiveRegistrationsFailure),
                reqFailure(dispatch, receiveRegistrationsFailure)
            );
    };
}

export const FETCH_DELETE_REGISTRATION_REQUEST = 'FETCH_DELETE_REGISTRATION_REQUEST';
function requestDeleteRegistration() {
    return {
        type: FETCH_DELETE_REGISTRATION_REQUEST,
    }
}

export const FETCH_DELETE_REGISTRATION_SUCCESS = 'FETCH_DELETE_REGISTRATION_SUCCESS';
function receiveDeleteRegistrationSuccess(id) {
    return {
        type: FETCH_DELETE_REGISTRATION_SUCCESS,
        id,
        receivedAt: Date.now(),
    }
}

export const FETCH_DELETE_REGISTRATION_FAILURE = 'FETCH_DELETE_REGISTRATION_FAILURE';
function receiveDeleteRegistrationFailure(error) {
    return {
        type: FETCH_DELETE_REGISTRATION_FAILURE,
        error,
    }
}

export function deleteRegistration(id) {
    return function(dispatch) {
        dispatch(requestDeleteRegistration());

        let headers = new Headers();
        headers.append('Content-Type', 'text/plain');
        fetch(`/api/u2f/registrations/${id}`, {
            credentials: 'same-origin',
            method: 'DELETE',
            headers,
        })
            .then(
                stringResponse(dispatch, receiveDeleteRegistrationSuccess, receiveDeleteRegistrationFailure),
                reqFailure(dispatch, receiveDeleteRegistrationFailure)
            );
    };
}

export const REQUIRE_U2F_REQUEST = 'REQUIRE_U2F_REQUEST';
function requireU2FRequest() {
    return {
        type: REQUIRE_U2F_REQUEST,
    }
}

export const REQUIRE_U2F_SUCCESS = 'REQUIRE_U2F_SUCCESS';
function requireU2FSuccess(user) {
    return {
        type: REQUIRE_U2F_SUCCESS,
        user,
        receivedAt: Date.now(),
    }
}

export const REQUIRE_U2F_FAILURE = 'REQUIRE_U2F_FAILURE';
function requireU2FFailure(error) {
    return {
        type: REQUIRE_U2F_FAILURE,
        error,
    }
}

export function requireU2F(required) {
    return function(dispatch) {
        dispatch(requireU2FRequest());

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');
        fetch(`/api/u2f/required`, {
            credentials: 'same-origin',
            method: 'PUT',
            headers,
            body: JSON.stringify({ u2fEnforced: required }),
        })
            .then(
                jsonResponse(dispatch, requireU2FSuccess, requireU2FFailure),
                reqFailure(dispatch, requireU2FFailure)
            );
    };
}
