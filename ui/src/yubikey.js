import { message } from 'openpgp';
import { encrypt, decrypt, fetchKey } from './crypto';

let sequence = 0;
let armoredCiphertext;

export function getPublicKey() {
    let device;
    navigator.usb.requestDevice({ filters: [{ vendorId: 0x1050 }] })
        .then(selectedDevice => {
            device = selectedDevice;
            return device.open(); // Begin a session.
        })
        .then(() => device.selectConfiguration(1))
        .then(() => device.claimInterface(2))

        // icc power on
        .then(() => device.transferOut(0x02, Uint8Array.from([0x62, 0x00, 0x00, 0x00, 0x00, 0x00, sequence++, 0x00, 0x00, 0x00])))
        .then(() => device.transferIn(0x02, 100))

        // get parameters
        .then(() => device.transferOut(0x02, Uint8Array.from([0x6C, 0x00, 0x00, 0x00, 0x00, 0x00, sequence++, 0x00, 0x00, 0x00])))
        .then(() => device.transferIn(0x02, 100))
        .then(resp => {
            // check for T-1 protocol
            if (resp.data.getUint8(9) !== 1) {
                throw new Error('Only T-1 protocol is supported');
            }

            // I don't know what the other fields mean so let's just assume its fine.
        })

        // set parameters (I have no idea what the parameters mean but whatever, it works)
        // I think this sets protocol T=1
        .then(() => device.transferOut(0x02, Uint8Array.from([0x61, 0x07, 0x00, 0x00, 0x00, 0x00, sequence++, 0x01, 0x00, 0x00, 0x11, 0x10, 0x00, 0x15, 0x00, 0xFE, 0x00])))
        .then(() => device.transferIn(0x02, 100))

        // send an abort for whatever reason
        .then(() => device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01, // abort
            value: 0x0200, // seq 2, slot 0
            index: 0x0002 // interface 2
        }, Uint8Array.from([])))

        .then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x0B, 0x00, 0x00, 0x00, 0x00, sequence++, 0x04, 0x00, 0x00,
            // adpu SELECT FILE
            0x00, 0xA4,
            // Direct selection by DF name
            0x04,
            // Select the first record
            0x00,
            // 6 bytes of data
            0x06,
            // This is selecting the AID directly by name
            // defined in opensc in src/pkcs15init/openpgp.profile
            0xD2, 0x76, 0x00, 0x01, 0x24, 0x01])))
        .then(() => device.transferIn(0x02, 2065))
        .then(resp => {
            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Unable to verify pin');
            }
        })
        .then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, sequence++, 0x04, 0x00, 0x00,
            0x00,
            // GET DATA
            0xCA,
            // URL of public key (https://gnupg.org/ftp/specs/openpgp-card-1.1.pdf)
            // only the value is returned because it is a simple request
            0x5F, 0x50,
            0x00])))
        .then(() => device.transferIn(0x02, 2065))
        .then(resp => {
            // check for the 90 00 return
            if (resp.data.getUint8(resp.data.byteLength - 2) !== 0x90 || resp.data.getUint8(resp.data.byteLength - 1) !== 0) {
                throw new Error('Unable to get public key URL');
            }

            // the response should contain the public key
            // abData starts at field 10
            // and goes until the last two status bytes 90 00
            let urlBytes = new Uint8Array(resp.data.buffer, 10, resp.data.byteLength - 10 - 2);
            return Array.from(urlBytes).map(c => String.fromCharCode(c)).join('');
        })
        .then(pubKeyUrl => fetchKey(pubKeyUrl))
        .then(pubKey => encrypt(pubKey, 'some long password'))
        .then(ciphertext => {
            armoredCiphertext = ciphertext
            console.log(armoredCiphertext);
        })
        .catch(error => {
            alert('Error getting public key');
            debugger;
        });
}

export async function getDecryptionKey() {
    let device;
    let pin = '123456';
    let ciphertext = message.readArmored(armoredCiphertext);

    // the key id is in the ciphertext but does not get sent to the yubikey
    let ciphertextPackets = ciphertext.packets[0].write().slice(11);
    await navigator.usb.requestDevice({ filters: [{ vendorId: 0x1050 }] })
        .then(selectedDevice => {
            device = selectedDevice;
            return device.open(); // Begin a session.
        })
        .then(() => device.selectConfiguration(1))
        .then(() => device.claimInterface(2))
        // this is necessary for decoding
        .then(() => {
            let xfrBlock = [
                // XfrBlock
                0x6F,
                // length 11
                0x0B, 0x00, 0x00, 0x00,
                // slot
                0x00,
                // sequence
                sequence++,
                // timeout
                0x00,
                // level
                0x00, 0x00,
                // apdu data
                // class 00
                0x00,
                // VERIFY command
                0x20,
                // p1
                0x00,
                // p2 - specific reference data
                0x82,
                // length
                pin.length,
            ];
            // push the pin chars on the back, but push their char codes
            xfrBlock = xfrBlock.concat(pin.split('').map(c => c.charCodeAt(0)));
            device.transferOut(0x02, Uint8Array.from(xfrBlock));
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Pin verification did not return 90 00');
            }
        })
        .then(() => {
            let xfrBlock = [
                // XfrBlock
                0x6F,
                // length - 11
                0x0B, 0x00, 0x00, 0x00,
                // slot
                0x00,
                // seq
                sequence++,
                // timeout
                0x00,
                // level
                0x00, 0x00,
                // apdu data
                // another verify
                0x00, 0x20, 0x00,
                // p2 = 10000001 which is again a specific reference
                // this is a reference to the pin
                0x81,
                // length of pin
                pin.length,
            ];
            // push the pin chars on the back, but push their char codes
            xfrBlock = xfrBlock.concat(pin.split('').map(c => c.charCodeAt(0)));
            device.transferOut(0x02, Uint8Array.from(xfrBlock));
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Second pin verification did not return 90 00');
            }
        })
        // for now, just support 256 byte cryptograms so we don't have to loop and send variable number of messages
        .then(() => {
            let payload = [
                // XfrBlock
                0x6F,
                // size 259
                0x03, 0x01, 0x00, 0x00,
                // slot 0
                0x00,
                // sequence
                sequence++,
                // timeout
                0x00,
                // level
                0x00, 0x00,
                // apdu data
                // were using chaining - check gnupg-2.2.4/scd/apdu.c#2757 and https://gnupg.org/ftp/specs/OpenPGP-smart-card-application-2.1.pdf section 7.4
                // this is not the last byte of the chain
                0x10,
                // this is a decipher https://github.com/Yubico/ykneo-openpgp/blob/1.0.11/applet/src/openpgpcard/OpenPGPApplet.java#L640
                // also https://gnupg.org/ftp/specs/OpenPGP-smart-card-application-2.1.pdf section 7.1 and 7.2.9
                0x2A, 0x80, 0x86,
                // the length packet is always 0xfe for some reason
                0xFE,
            ];
            // 1 byte padding for RSA
            payload.push(0);

            // first byte is length, send the rest of the ciphertext (but only 0xFE bytes)
            payload = payload.concat(Array.from(ciphertextPackets.slice(1, 0xFE)));
            device.transferOut(0x02, Uint8Array.from(payload));
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Unable to push cryptogram');
            }
        })
        .then(() => {
            let payload = [
                // XfrBlock
                0x6F,
                // size 9
                0x09, 0x00, 0x00, 0x00,
                0x00,
                // seq
                sequence++,
                0x00, 0x00, 0x00,
                // apdu stuff
                0x00,
                0x2A, 0x80, 0x86,
                // remaining packets - always 3
                3,
            ];
            // this will break for longer cryptograms :(
            // send the rest of the ciphertext
            payload = payload.concat(Array.from(ciphertextPackets.slice(0xFE)));
            // terminating 0
            payload.push(0);
            device.transferOut(0x02, Uint8Array.from(payload));
        })
        .catch(error => {
            alert('Error decrypting');
            debugger;
        });

    // start polling
    console.log('Tap the yubikey');
    for (let j = 0; j < 20; ++j) {
        try {
            let resp = await device.transferIn(0x02, 65556);
            if (resp.data.getUint8(resp.data.byteLength - 2) === 0x90 && resp.data.getUint8(resp.data.byteLength - 1) === 0) {
                // the first byte should be 0x09, which signifies aes256 algo
                if (resp.data.getUint8(10) !== 0x09) {
                    throw new Error('Unknown key algorithm detected');
                }

                // from index 11, to the end - 2 (0x90 0x00)
                // the key also has some verification digits on the end (maybe this is mdc, idk. but its 2 bytes)
                let key = new Uint8Array(resp.data.buffer, 11, resp.data.byteLength - 2 - 11 - 2);
                decrypt(armoredCiphertext, key, 'aes256');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            alert('Caught exception waiting for key');
            console.log(e);
            break;
        }
    }
}
