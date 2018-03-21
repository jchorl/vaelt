import { List, Map } from "immutable";
import { decryptUsingSessionKey, decryptUsingPrivateKey } from "../crypto";
import { selectDevice, initDecryption, finishDecryption } from "../yubikey";
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

// decrypts multiple ciphertexts using key and secret
// errors and other state messages are keyed by taskID
export function decrypt(key, ciphertexts, secret, taskID) {
  return async function(dispatch) {
    dispatch(decryptionRequest(taskID));

    try {
      switch (key.get("device")) {
        case "password": {
          const privateKey = await dispatch(
            fetchPasswordPrivateKey(key.get("name"))
          );

          const decrypteds = List(
            await Promise.all(
              ciphertexts.map(ciphertext =>
                decryptUsingPrivateKey(
                  ciphertext,
                  privateKey.get("armoredKey"),
                  secret
                )
              )
            )
          );
          dispatch(decryptionSuccess(taskID));
          return decrypteds;
        }
        case "yubikey": {
          await selectDevice();

          let decrypteds = List();
          for (let ciphertext of ciphertexts) {
            await initDecryption(secret, ciphertext);

            // dispatch the tap required
            dispatch(yubikeyTapRequired(taskID));

            const decryptionKey = await finishDecryption();
            const decrypted = await decryptUsingSessionKey(
              ciphertext,
              decryptionKey,
              "aes256"
            );

            decrypteds = decrypteds.push(decrypted);
          }
          dispatch(decryptionSuccess(taskID));
          return decrypteds;
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
