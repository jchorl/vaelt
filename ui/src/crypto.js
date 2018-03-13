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
    let rawKeyURL = new URL(keyUrl);
    rawKeyURL.searchParams.set('options', 'mr');
    // http reqs must be proxied due to mixed content requirements on chrome. e.g.
    // sks-keyservers uses their own custom signed cert.
    // fetch wont fetch over http (mixed content) and wont allow you to pin a cert
    // so just proxy through vaelt.
    if (rawKeyURL.protocol === 'http:' || rawKeyURL.hostname === 'hkps.pool.sks-keyservers.net') {
        let proxyURL = new URL('/api/keys/proxy', window.location);
        proxyURL.searchParams.set('url', rawKeyURL.toString());
        return fetch(proxyURL).then(resp => resp.text());
    }
    return fetch(rawKeyURL).then(resp => resp.text());
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
