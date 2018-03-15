import openpgp, { key } from 'openpgp';
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
        .then(ciphertext => ciphertext.data);

    return Map({
        encryptedMessage,
        key: keyID,
    });
}
