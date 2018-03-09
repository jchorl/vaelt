import openpgp from 'openpgp';

export async function generateKeyPair(email, passphrase) {
    const options = {
        userIds: [{ email }],
        curve: "curve25519",
        passphrase,
    };

    return openpgp.generateKey(options);
}
