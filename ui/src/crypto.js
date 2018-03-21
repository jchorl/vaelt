import openpgp, { key, message } from "openpgp";
import { Map } from "immutable";

// straight from https://stackoverflow.com/a/2117523/3851016
export function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

export async function generateKeyPair(email, passphrase) {
  const options = {
    userIds: [{ email }],
    curve: "ed25519",
    passphrase,
  };

  return openpgp.generateKey(options);
}

export async function encrypt(secret, encryptingKey, title, version) {
  const options = {
    data: secret,
    publicKeys: key.readArmored(encryptingKey.get("armoredKey")).keys,
  };

  const encryptedMessage = await openpgp.encrypt(options).then(
    ciphertext => ciphertext.data,
    err => {
      console.error(err);
      const m = Map({ message: err.message, key: encryptingKey.get("id") });
      return Promise.reject(m);
    }
  );

  return Map({
    encryptedMessage,
    key: encryptingKey.get("id"),
    title,
    version,
  });
}

export async function decryptUsingSessionKey(
  ciphertext,
  decryptionKey,
  algorithm
) {
  let msg = message.readArmored(ciphertext);
  let sessionKey = {
    data: decryptionKey,
    algorithm,
  };
  return msg
    .decrypt(null, null, [sessionKey])
    .then(message => message.getText());
}

export async function decryptUsingPrivateKey(ciphertext, privateKey, password) {
  const privKeyObj = key.readArmored(privateKey).keys[0];
  await privKeyObj.decrypt(password);

  const options = {
    message: message.readArmored(ciphertext),
    privateKeys: [privKeyObj],
  };

  return openpgp.decrypt(options).then(plaintext => plaintext.data);
}
