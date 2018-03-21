import { decryptUsingSessionKey, decryptUsingPrivateKey } from "../crypto";
import { initDecryption, finishDecryption } from "../yubikey";
import { fetchPasswordPrivateKey } from "./keys";

export const DECRYPTION_REQUEST = "DECRYPTION_REQUEST";
function decryptionRequest(taskID) {
  return {
    type: DECRYPTION_REQUEST,
    taskID,
  };
}

export const DECRYPTION_SUCCESS = "DECRYPTION_SUCCESS";
function decryptionSuccess(taskID) {
  // do not pass on decrypted value
  return {
    type: DECRYPTION_SUCCESS,
    taskID,
  };
}

export const DECRYPTION_FAILURE = "DECRYPTION_FAILURE";
function decryptionFailure(error) {
  return {
    type: DECRYPTION_FAILURE,
    error,
  };
}

export const YUBIKEY_TAP_REQUIRED = "YUBIKEY_TAP_REQUIRED";
function yubikeyTapRequired(taskID) {
  return {
    type: YUBIKEY_TAP_REQUIRED,
    taskID,
  };
}

// decrypts ciphertext using key and secret
// errors and other state messages are keyed by taskID
export function decrypt(key, ciphertext, secret, taskID) {
  return async function(dispatch) {
    dispatch(decryptionRequest(taskID));

    try {
      switch (key.get("device")) {
        case "password": {
          // TODO one fetch for all decrypts
          // fetch the private key
          const privateKey = await dispatch(
            fetchPasswordPrivateKey(key.get("name"))
          );
          const decrypted = await decryptUsingPrivateKey(
            ciphertext,
            privateKey.get("armoredKey"),
            secret
          );
          dispatch(decryptionSuccess(taskID));
          return decrypted;
        }
        case "yubikey": {
          await initDecryption(secret, ciphertext);

          // dispatch the tap required
          dispatch(yubikeyTapRequired(taskID));

          const decryptionKey = await finishDecryption();
          const decrypted = await decryptUsingSessionKey(
            ciphertext,
            decryptionKey,
            "aes256"
          );
          dispatch(decryptionSuccess(taskID));
          return decrypted;
        }
        default: {
          const m = Map({
            message: "Only decryption by Yubikey or password is supported",
            taskID,
          });
          dispatch(decryptionFailure(m));
          return Promise.reject(m);
        }
      }
    } catch (e) {
      // the error may have already been parsed
      let m = Map({ message: e.message, taskID });
      if (Map.isMap(e)) {
        m = Map({ message: e.get("message"), taskID });
      }
      dispatch(decryptionFailure(m));
      return Promise.reject(m);
    }
  };
}
