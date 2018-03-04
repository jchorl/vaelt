import { jsonResponse } from './parseResponse';

export const FETCH_VAULT_ALL_REQUEST = 'FETCH_VAULT_ALL_REQUEST';
function requestVaultAll() {
    return {
        type: FETCH_VAULT_ALL_REQUEST,
    }
}

export const FETCH_VAULT_ALL_SUCCESS = 'FETCH_VAULT_ALL_SUCCESS';
function receiveVaultAllSuccess(entries) {
    return {
        type: FETCH_VAULT_ALL_SUCCESS,
        entries,
        receivedAt: Date.now(),
    }
}

export const FETCH_VAULT_ALL_FAILURE = 'FETCH_VAULT_ALL_FAILURE';
function receiveVaultAllFailure(error) {
    return {
        type: FETCH_VAULT_ALL_FAILURE,
        error,
    }
}

export function fetchAllFromVaultIfNeeded() {
    return function(dispatch, getState) {
        const { vault } = getState();
        if (vault.get('isFetching') || vault.get('receivedAt')) {
            return Promise.resolve();
        }

        dispatch(requestVaultAll());

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        return fetch("/api/vault", {
            method: 'GET',
            credentials: 'same-origin',
            headers: headers,
        })
            .then(
                jsonResponse(dispatch, receiveVaultAllSuccess, receiveVaultAllFailure)
            );
    };
}
