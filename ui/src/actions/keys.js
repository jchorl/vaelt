import { jsonResponse, stringResponse, reqFailure } from './parseResponse';

export const FETCH_KEYS_REQUEST = 'FETCH_KEYS_REQUEST';
function requestKeys() {
    return {
        type: FETCH_KEYS_REQUEST,
    }
}

export const FETCH_KEYS_SUCCESS = 'FETCH_KEYS_SUCCESS';
function receiveKeysSuccess(keys) {
    return {
        type: FETCH_KEYS_SUCCESS,
        keys,
        receivedAt: Date.now(),
    }
}

export const FETCH_KEYS_FAILURE = 'FETCH_KEYS_FAILURE';
function receiveKeysFailure(error) {
    return {
        type: FETCH_KEYS_FAILURE,
        error,
    }
}

export function fetchKeysIfNeeded() {
    return function(dispatch, getState) {
        const { keys } = getState();
        if (keys.get('receivedAt') || keys.get('isFetching')) {
            return Promise.resolve();
        }

        dispatch(requestKeys());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        return fetch("/api/keys", {
            credentials: 'same-origin',
            method: 'GET',
            headers,
        })
            .then(
                jsonResponse(dispatch, receiveKeysSuccess, receiveKeysFailure),
                reqFailure(dispatch, receiveKeysFailure)
            );
    };
}

export const KEY_POST_REQUEST = 'KEY_POST_REQUEST';
function requestKeyPost() {
    return {
        type: KEY_POST_REQUEST,
    }
}

export const KEY_POST_SUCCESS = 'KEY_POST_SUCCESS';
function keyPostSuccess(key) {
    return {
        type: KEY_POST_SUCCESS,
        key,
        receivedAt: Date.now(),
    }
}

export const KEY_POST_FAILURE = 'KEY_POST_FAILURE';
function keyPostFailure(error) {
    return {
        type: KEY_POST_FAILURE,
        error,
    }
}

export function addKey(key) {
    return function(dispatch) {
        dispatch(requestKeyPost());

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        fetch("/api/keys", {
            credentials: 'same-origin',
            method: 'POST',
            body: JSON.stringify(key),
            headers,
        })
            .then(
                jsonResponse(dispatch, keyPostSuccess, keyPostFailure),
                reqFailure(dispatch, keyPostFailure)
            );
    };
}

export const REVOKE_KEY_REQUEST = 'REVOKE_KEY_REQUEST';
function revokeKeyRequest() {
    return {
        type: REVOKE_KEY_REQUEST,
    }
}

export const REVOKE_KEY_SUCCESS = 'REVOKE_KEY_SUCCESS';
function revokeKeySuccess(id) {
    return {
        type: REVOKE_KEY_SUCCESS,
        id,
        receivedAt: Date.now(),
    }
}

export const REVOKE_KEY_FAILURE = 'REVOKE_KEY_FAILURE';
function revokeKeyFailure(error) {
    return {
        type: REVOKE_KEY_FAILURE,
        error,
    }
}

export function revokeKey(id) {
    return function(dispatch) {
        dispatch(revokeKeyRequest());

        let headers = new Headers();
        headers.append('Accept', 'text/plain');
        fetch(`/api/keys/${id}`, {
            credentials: 'same-origin',
            method: 'DELETE',
            headers,
        })
            .then(
                stringResponse(dispatch, revokeKeySuccess, revokeKeyFailure),
                reqFailure(dispatch, revokeKeyFailure)
            );
    };
}

export const FETCH_KEYS_FOR_VAULT_ENTRY_REQUEST = 'FETCH_KEYS_FOR_VAULT_ENTRY_REQUEST';
function requestKeysForVaultEntry() {
    return {
        type: FETCH_KEYS_FOR_VAULT_ENTRY_REQUEST,
    }
}

export const FETCH_KEYS_FOR_VAULT_ENTRY_FAILURE = 'FETCH_KEYS_FOR_VAULT_ENTRY_FAILURE';
function receiveKeysForVaultEntryFailure(error) {
    return {
        type: FETCH_KEYS_FOR_VAULT_ENTRY_FAILURE,
        error,
    }
}

export function fetchKeysForVaultEntry(title) {
    return function(dispatch) {
        dispatch(requestKeysForVaultEntry());

        let keysURL = new URL('/api/keys', window.location);
        keysURL.searchParams.set('vaultTitle', title);
        let headers = new Headers();
        headers.append('Accept', 'application/json');
        return fetch(keysURL, {
            credentials: 'same-origin',
            method: 'GET',
            headers,
        })
            .then(
                jsonResponse(dispatch, undefined, receiveKeysForVaultEntryFailure),
                reqFailure(dispatch, receiveKeysForVaultEntryFailure)
            );
    };
}

export const FETCH_KEY_BY_ID_REQUEST = 'FETCH_KEY_BY_ID_REQUEST';
function requestKeyByID() {
    return {
        type: FETCH_KEY_BY_ID_REQUEST,
    }
}

export const FETCH_KEY_BY_ID_FAILURE = 'FETCH_KEY_BY_ID_FAILURE';
function fetchKeyByIDFailure(error) {
    return {
        type: FETCH_KEY_BY_ID_FAILURE,
        error,
    }
}

export function fetchKeyByID(id) {
    return function(dispatch) {
        dispatch(requestKeyByID());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        return fetch(`/api/keys/${id}`, {
            credentials: 'same-origin',
            method: 'GET',
            headers,
        })
            .then(
                jsonResponse(dispatch, undefined, fetchKeyByIDFailure),
                reqFailure(dispatch, fetchKeyByIDFailure)
            );
    };
}
