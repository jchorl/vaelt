import { List, Map } from "immutable";
import { jsonResponse, stringResponse, reqFailure } from "./parseResponse";
import { encrypt } from "../crypto";

export const FETCH_VAULT_ALL_REQUEST = "FETCH_VAULT_ALL_REQUEST";
function requestVaultAll() {
  return {
    type: FETCH_VAULT_ALL_REQUEST,
  };
}

export const FETCH_VAULT_ALL_SUCCESS = "FETCH_VAULT_ALL_SUCCESS";
function receiveVaultAllSuccess(entries) {
  return {
    type: FETCH_VAULT_ALL_SUCCESS,
    entries,
    receivedAt: Date.now(),
  };
}

export const FETCH_VAULT_ALL_FAILURE = "FETCH_VAULT_ALL_FAILURE";
function receiveVaultAllFailure(error) {
  return {
    type: FETCH_VAULT_ALL_FAILURE,
    error,
  };
}

export function fetchAllFromVaultIfNeeded() {
  return function(dispatch, getState) {
    const { vault } = getState();
    if (vault.get("isFetching") || vault.get("receivedAt")) {
      return Promise.resolve();
    }

    dispatch(requestVaultAll());

    let headers = new Headers();
    headers.append("Accept", "application/json");
    return fetch("/api/vault", {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
    }).then(
      jsonResponse(dispatch, receiveVaultAllSuccess, receiveVaultAllFailure),
      reqFailure(dispatch, receiveVaultAllFailure)
    );
  };
}

export const ADD_TO_VAULT_SUCCESS = "ADD_TO_VAULT_SUCCESS";
function addToVaultSuccess(entries) {
  return {
    type: ADD_TO_VAULT_SUCCESS,
    entries,
    receivedAt: Date.now(),
  };
}

export const NEW_VAULT_ENTRY_FAILURE = "NEW_VAULT_ENTRY_FAILURE";
function newVaultEntryFailure(error) {
  return {
    type: NEW_VAULT_ENTRY_FAILURE,
    error,
  };
}

export const UPDATE_VAULT_FAILURE = "UPDATE_VAULT_FAILURE";
function updateVaultFailure(error) {
  return {
    type: UPDATE_VAULT_FAILURE,
    error,
  };
}

export const REENCRYPTION_FAILURE = "REENCRYPTION_FAILURE";
function reencryptionFailure(error) {
  return {
    type: REENCRYPTION_FAILURE,
    error,
  };
}

export function newVaultEntry(title, secret, keys) {
  return async function(dispatch, getState) {
    // make sure the entry is not a duplicate title
    if (getState().vault.hasIn(["entries", title])) {
      const m = Map({
        message:
          "Cannot add an entry with the same title. Please update the entry instead.",
      });
      dispatch(newVaultEntryFailure(m));
      return Promise.reject(m);
    }

    // filter for public keys
    const publicKeys = keys.filter(k => k.get("type") === "public");

    // do the encryption and add to vault
    return dispatch(
      addToVault(
        List([secret]), // secrets
        List([title]), // titles
        List(), // versions
        publicKeys, // keys to encrypt with
        addToVaultSuccess,
        newVaultEntryFailure
      )
    );
  };
}

export function updateVaultEntry(title, secret, keys) {
  return async function(dispatch, getState) {
    // filter for public keys
    const publicKeys = keys.filter(k => k.get("type") === "public");

    // do the encryption and add to vault
    return dispatch(
      addToVault(
        List([secret]), // secrets
        List([title]), // titles
        List(), // versions
        publicKeys, // keys to encrypt with
        addToVaultSuccess,
        updateVaultFailure
      )
    );
  };
}

export function reencryptWithNewKey(secrets, oldEntries, key) {
  // just proxy the request
  return addToVault(
    secrets, // secrets
    oldEntries.map(e => e.get("title")), // titles
    oldEntries.map(e => e.get("version")), // versions
    List([key]), // keys to encrypt with
    addToVaultSuccess,
    reencryptionFailure
  );
}

// secrets, titles, and versions should be equal lengths.
// it is fine to pass an empty list for versions, and latest will be used.
// each (s, t, v) row will be encrypted with all keys (cartesian product).
function addToVault(
  secrets,
  titles,
  versions,
  keys,
  successHandler,
  failureHandler
) {
  return async function(dispatch) {
    if (keys.isEmpty()) {
      const m = Map({ message: "Cant encrypt with no keys provided" });
      dispatch(failureHandler(m));
      return Promise.reject(m);
    }

    // convert all URL keys to armored keys, so they dont get repeatedly requested in the cartesian product
    let armoredKeys;
    try {
      armoredKeys = List(
        await Promise.all(
          keys.map(
            k =>
              !!k.get("armoredKey")
                ? k
                : // fetch the key, and replace the url with the armored key
                  dispatch(
                    fetchArmoredKeyByURL(k.get("id"), k.get("url"))
                  ).then(armoredKey => k.merge({ url: "", armoredKey }))
          )
        )
      );
    } catch (err) {
      const name = keys.find(k => k.get("id") === err.get("key")).get("name");
      const m = err.update(
        "message",
        message =>
          `Failed to fetch key "${name}". Consider checking that the key URL is valid. Error message: ${message}`
      );
      dispatch(failureHandler(m));
      throw m;
    }

    let newEntries;
    const encryptionPromises = cartesian(
      secrets.zipAll(titles, versions),
      armoredKeys
    ).map(([[secret, title, version], key]) =>
      encrypt(secret, key, title, version)
    );
    try {
      newEntries = List(await Promise.all(encryptionPromises));
    } catch (err) {
      // give meaningful error when keys are invalid
      console.error(err);
      const name = keys.find(k => k.get("id") === err.get("key")).get("name");
      const m = err.update(
        "message",
        message =>
          `Failed to encrypt using key "${name}". Consider checking that the key is valid. Error message: ${message}`
      );
      dispatch(failureHandler(m));
      throw m;
    }

    // post the new ciphertexts
    let headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("Content-Type", "application/json");
    return fetch("/api/vault", {
      method: "POST",
      credentials: "same-origin",
      headers: headers,
      body: JSON.stringify(newEntries),
    }).then(
      jsonResponse(dispatch, addToVaultSuccess, failureHandler),
      reqFailure(dispatch, failureHandler)
    );
  };
}

function fetchArmoredKeyByURL(keyID, url) {
  return function(dispatch) {
    // keyUrl won't get the raw cert
    let rawKeyURL = new URL(url);
    rawKeyURL.searchParams.set("options", "mr");
    // http reqs must be proxied due to mixed content requirements on chrome. e.g.
    // sks-keyservers uses their own custom signed cert.
    // fetch wont fetch over http (mixed content) and wont allow you to pin a cert
    // so just proxy through vaelt.
    if (rawKeyURL.protocol === "http:") {
      let proxyURL = new URL("/api/keys/proxy", window.location);
      proxyURL.searchParams.set("url", rawKeyURL.toString());
      rawKeyURL = proxyURL;
    }
    return fetch(rawKeyURL)
      .then(stringResponse(), reqFailure())
      .then(resp => resp, err => Promise.reject(err.set("key", keyID)));
  };
}

export const DELETE_BY_TITLE_REQUEST = "DELETE_BY_TITLE_REQUEST";
function deleteByTitleRequest(taskID) {
  return {
    type: DELETE_BY_TITLE_REQUEST,
    taskID,
  };
}

export const DELETE_BY_TITLE_SUCCESS = "DELETE_BY_TITLE_SUCCESS";
function deleteByTitleSuccess(taskID, title) {
  return {
    type: DELETE_BY_TITLE_SUCCESS,
    title,
    taskID,
    receivedAt: Date.now(),
  };
}

export const DELETE_BY_TITLE_FAILURE = "DELETE_BY_TITLE_FAILURE";
function deleteByTitleFailure(taskID, error) {
  return {
    type: DELETE_BY_TITLE_FAILURE,
    taskID,
    error,
  };
}

export function deleteByTitle(taskID, title) {
  return function(dispatch) {
    dispatch(deleteByTitleRequest(taskID));

    let headers = new Headers();
    headers.append("Accept", "text/plain");
    return fetch(`/api/vault/${title}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: headers,
    }).then(
      stringResponse(
        dispatch,
        deleteByTitleSuccess.bind(undefined, taskID),
        deleteByTitleFailure.bind(undefined, taskID)
      ),
      reqFailure(dispatch, deleteByTitleFailure.bind(undefined, taskID))
    );
  };
}

function cartesian(A, B) {
  return A.map(a => B.map(b => [a, b])).flatten(1);
}
