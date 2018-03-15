import openpgp, { key, message } from 'openpgp';
import { Map } from 'immutable';

export async function generateKeyPair(email, passphrase) {
    const options = {
        userIds: [{ email }],
        curve: "ed25519",
        passphrase,
    };

    return openpgp.generateKey(options);
}

export async function encrypt(secret, keyID, armoredKey) {
    const options = {
        data: secret,
        publicKeys: key.readArmored(armoredKey).keys,
    };

    const encryptedMessage = await openpgp.encrypt(options)
        .then(
            ciphertext => ciphertext.data,
            err => {
                console.error(err);
                const m = Map({ message: err.message, key: keyID });
                return Promise.reject(m);
            }
        );

    return Map({
        encryptedMessage,
        key: keyID,
    });
}

export async function decryptUsingSessionKey(ciphertext, key, algorithm) {
    let msg = message.readArmored(ciphertext);
    let sessionKey = {
        data: key,
        algorithm,
    };
    return msg.decrypt(null, null, [sessionKey])
        .then(message => message.getText())
}
