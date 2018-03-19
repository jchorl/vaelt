import { Map } from 'immutable';
import { jsonResponse, stringResponse, reqFailure } from './parseResponse';
import { fetchKeysIfNeeded } from './keys';
import { encrypt, decryptUsingSessionKey, decryptUsingPrivateKey } from '../crypto';
import { initDecryption, finishDecryption } from '../yubikey';
import { fetchPasswordPrivateKey } from './keys';

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

export const UPDATE_VAULT_SUCCESS = 'UPDATE_VAULT_SUCCESS';
function updateVaultSuccess(entries) {
    return {
        type: UPDATE_VAULT_SUCCESS,
        entries,
        receivedAt: Date.now(),
    }
}

export const UPDATE_VAULT_FAILURE = 'UPDATE_VAULT_FAILURE';
function updateVaultFailure(error) {
    return {
        type: UPDATE_VAULT_FAILURE,
        error,
    }
}

export function addToVault(title, secret, isUpdate) {
    return async function(dispatch, getState) {
        dispatch(addToVaultRequest());

        const failureHandler = isUpdate ? updateVaultFailure : addToVaultFailure;
        const successHandler = isUpdate ? updateVaultSuccess : addToVaultSuccess;

        // if they are trying to add a duplicate, tell them to update it
        if (!isUpdate && getState().vault.hasIn(['entries', title])) {
            const m = Map({ message: 'Cannot add an entry with the same title. Please update the entry instead.' });
            dispatch(failureHandler(m));
            return Promise.reject(m);
        }

        // fetch all public keys
        try {
            await dispatch(fetchKeysIfNeeded());
        } catch (err) {
            dispatch(failureHandler(err));
            return Promise.reject(err);
        }
        const publicKeys = getState().keys.get('keys').filter(k => k.get('type') === 'public');

        // encrypt the secret with all public keys
        // some keys might require fetching by URL
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
            // give meaningful error when keys are invalid
            const name = publicKeys.find(k => k.get('id') === err.get('key')).get('name');
            const m = err.update('message', message => `Failed to encrypt using key "${name}". Consider checking that the key is valid. Error message: ${message}`);
            dispatch(failureHandler(m));
            return Promise.reject(m);
        }

        // set the titles
        entries = entries.map(entry => entry.set('title', title));

        // post the new ciphertexts
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
                jsonResponse(dispatch, successHandler, failureHandler),
                reqFailure(dispatch, failureHandler)
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

export const DELETE_BY_TITLE_REQUEST = 'DELETE_BY_TITLE_REQUEST';
function deleteByTitleRequest(taskID) {
    return {
        type: DELETE_BY_TITLE_REQUEST,
        taskID,
    }
}

export const DELETE_BY_TITLE_SUCCESS = 'DELETE_BY_TITLE_SUCCESS';
function deleteByTitleSuccess(taskID, title) {
    return {
        type: DELETE_BY_TITLE_SUCCESS,
        title,
        taskID,
        receivedAt: Date.now(),
    }
}

export const DELETE_BY_TITLE_FAILURE = 'DELETE_BY_TITLE_FAILURE';
function deleteByTitleFailure(taskID, error) {
    return {
        type: DELETE_BY_TITLE_FAILURE,
        taskID,
        error,
    }
}

export function deleteByTitle(taskID, title) {
    return function(dispatch) {
        dispatch(deleteByTitleRequest(taskID));

        let headers = new Headers();
        headers.append('Accept', 'text/plain');
        return fetch(`/api/vault/${title}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: headers,
        })
            .then(
                stringResponse(dispatch, deleteByTitleSuccess.bind(undefined, taskID), deleteByTitleFailure.bind(undefined, taskID)),
                reqFailure(dispatch, deleteByTitleFailure.bind(undefined, taskID))
            );
    };
}

export const DECRYPTION_SUCCESS = 'DECRYPTION_SUCCESS';
function decryptionSuccess(taskID) {
    // do not pass on decrypted value
    return {
        type: DECRYPTION_SUCCESS,
        taskID,
    }
}

export const DECRYPTION_FAILURE = 'DECRYPTION_FAILURE';
function decryptionFailure(error) {
    return {
        type: DECRYPTION_FAILURE,
        error,
    }
}

export const YUBIKEY_TAP_REQUIRED = 'YUBIKEY_TAP_REQUIRED';
function yubikeyTapRequired(taskID) {
    return {
        type: YUBIKEY_TAP_REQUIRED,
        taskID,
    }
}

// decrypts ciphertext using key and secret
// errors and other state messages are keyed by taskID
export function decrypt(key, ciphertext, secret, taskID) {
    return async function(dispatch, getState) {
        switch (key.get('device')) {
            case 'password':
                // fetch the private key
                try {
                    const privateKey = await dispatch(fetchPasswordPrivateKey());
                    const decrypted = await decryptUsingPrivateKey(ciphertext, privateKey.get('armoredKey'), secret);
                    dispatch(decryptionSuccess(taskID));
                    return decrypted;
                } catch (e) {
                    const m = Map({ message: e.message, taskID });
                    dispatch(decryptionFailure(m));
                    return Promise.reject(m);
                }
            case 'yubikey':
                try {
                    await initDecryption(secret, ciphertext);

                    // dispatch the tap required
                    dispatch(yubikeyTapRequired(taskID));

                    const decryptionKey = await finishDecryption();
                    const decrypted = await decryptUsingSessionKey(ciphertext, decryptionKey, 'aes256');
                    dispatch(decryptionSuccess(taskID));
                    return decrypted;
                } catch (e) {
                    const m = Map({ message: e.message, taskID });
                    dispatch(decryptionFailure(m));
                    return Promise.reject(m);
                }
            default:
                const m = Map({ message: 'Only decryption by Yubikey or password is supported', taskID });
                dispatch(decryptionFailure(m));
                return Promise.reject(m);
        }
    }
}
