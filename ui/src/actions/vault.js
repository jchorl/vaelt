import { jsonResponse } from './parseResponse';
import { fetchKeysIfNeeded } from './keys';
import { encrypt } from '../crypto';

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

export const ADD_TO_VAULT_REQUEST = 'ADD_TO_VAULT_REQUEST';
function addToVaultRequest() {
    return {
        type: ADD_TO_VAULT_REQUEST,
    }
}

export const ADD_TO_VAULT_SUCCESS = 'ADD_TO_VAULT_SUCCESS';
function addToVaultSuccess(entries) {
    return {
        type: ADD_TO_VAULT_SUCCESS,
        entries,
        receivedAt: Date.now(),
    }
}

export const ADD_TO_VAULT_FAILURE = 'ADD_TO_VAULT_FAILURE';
function addToVaultFailure(error) {
    return {
        type: ADD_TO_VAULT_FAILURE,
        error,
    }
}

export function addToVault(title, secret) {
    return async function(dispatch, getState) {
        dispatch(addToVaultRequest());

        let entries;
        try {
            await dispatch(fetchKeysIfNeeded());
            const publicKeys = getState().keys.get('keys').filter(k => k.get('type') === 'public');
            entries = await Promise.all(
                publicKeys.map(key => encrypt(secret, key))
            );

            entries = entries.map(entry => entry.set('title', title));
        } catch (e) {
            dispatch(addToVaultFailure(e));
            return Promise.reject(e);
        }

        let headers = new Headers();
        headers.append('Accept', 'application/json');
        headers.append('Content-Type', 'application/json');
        return fetch("/api/vault", {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify(entries),
        })
            .then(
                jsonResponse(dispatch, addToVaultSuccess, addToVaultFailure)
            );
    }
}
