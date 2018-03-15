import { Map } from 'immutable';
import { jsonResponse, stringResponse, reqFailure } from './parseResponse';
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
                jsonResponse(dispatch, receiveVaultAllSuccess, receiveVaultAllFailure),
                reqFailure(dispatch, receiveVaultAllFailure)
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

        // if they are trying to add a duplicate, tell them to update it
        if (getState().vault.hasIn(['entries', title])) {
            const m = Map({ message: 'Cannot add an entry with the same title. Please update the entry instead.' });
            dispatch(addToVaultFailure(m));
            return Promise.reject(m);
        }

        try {
            await dispatch(fetchKeysIfNeeded());
        } catch (err) {
            dispatch(addToVaultFailure(err));
            return Promise.reject(err);
        }

        const publicKeys = getState().keys.get('keys').filter(k => k.get('type') === 'public');
        let entries;
        try {
            entries = await Promise.all(
                publicKeys.map(key => {
                    if (!!key.get('url')) {
                        return dispatch(fetchArmoredKeyByURL(key.get('id'), key.get('url'))).then(
                            armoredKey => encrypt(secret, key.get('id'), armoredKey),
                            err => Promise.reject(err)
                        );
                    }
                    return encrypt(secret, key.get('id'), key.get('armoredKey'));
                })
            );
        } catch (err) {
            const name = publicKeys.find(k => k.get('id') === err.get('key')).get('name');
            const m = err.update('message', message => `Failed to encrypt using key "${name}". Consider checking that the key is valid. Error message: ${message}`);
            dispatch(addToVaultFailure(m));
            return Promise.reject(m);
        }
        entries = entries.map(entry => entry.set('title', title));

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
                jsonResponse(dispatch, addToVaultSuccess, addToVaultFailure),
                reqFailure(dispatch, addToVaultFailure)
            );
    }
}

function fetchArmoredKeyByURL(keyID, url) {
    return function(dispatch) {
        // keyUrl won't get the raw cert
        let rawKeyURL = new URL(url);
        rawKeyURL.searchParams.set('options', 'mr');
        // http reqs must be proxied due to mixed content requirements on chrome. e.g.
        // sks-keyservers uses their own custom signed cert.
        // fetch wont fetch over http (mixed content) and wont allow you to pin a cert
        // so just proxy through vaelt.
        if (rawKeyURL.protocol === 'http:') {
            let proxyURL = new URL('/api/keys/proxy', window.location);
            proxyURL.searchParams.set('url', rawKeyURL.toString());
            rawKeyURL = proxyURL;
        }
        return fetch(rawKeyURL).then(
            stringResponse(),
            reqFailure()
        ).then(
            resp => resp,
            err => Promise.reject(err.set('key', keyID))
        );
    }
}
