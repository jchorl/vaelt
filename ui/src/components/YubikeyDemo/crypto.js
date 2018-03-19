import openpgp, { key, message } from "openpgp";

export async function fetchKey(keyUrl) {
  // keyUrl won't get the raw cert
  let rawKeyUrl = new URL(keyUrl);
  rawKeyUrl.searchParams.set("options", "mr");
  return fetch(rawKeyUrl).then(resp => resp.text());
}

// keyUrl and message are strings
export async function encrypt(pubKey, message) {
  const options = {
    data: message,
    publicKeys: key.readArmored(pubKey).keys,
  };

  return openpgp.encrypt(options).then(ciphertext => ciphertext.data);
}

export async function decrypt(ciphertext, key, algorithm) {
  let msg = message.readArmored(ciphertext);
  let sessionKey = {
    data: key,
    algorithm,
  };
  return msg
    .decrypt(null, sessionKey, null)
    .then(message => message.getText())
    .then(plaintext => console.log(plaintext));
}
