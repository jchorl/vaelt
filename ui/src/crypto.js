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

export async function fetchKey(keyUrl) {
    // keyUrl won't get the raw cert
    let rawKeyUrl = new URL(keyUrl);
    rawKeyUrl.searchParams.set('options', 'mr');
    return fetch(rawKeyUrl)
        .then(resp => resp.text());
}

export async function encrypt(secret, pubKey) {
    let armoredKey = pubKey.get('armoredKey');
    if (pubKey.get('url')) {
        armoredKey = await fetchKey(pubKey.get('url'));
    }

    const options = {
        data: secret,
        publicKeys: key.readArmored(armoredKey).keys,
    };

    const encryptedMessage = await openpgp.encrypt(options)
        .then(ciphertext => ciphertext.data);

    return Map({
        encryptedMessage,
        key: pubKey.get('id'),
    });
}
