import React, { Component } from 'react';
import './App.css';

let cryptogram;

function getPublicKey() {
    let device;
    navigator.usb.requestDevice({ filters: [{ vendorId: 0x1050 }] })
        .then(selectedDevice => {
            device = selectedDevice;
            return device.open(); // Begin a session.
        })
        .then(() => device.selectConfiguration(1))
        .then(() => device.claimInterface(2))

        // icc power on
        .then(() => device.transferOut(0x02, Uint8Array.from([0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])))
        .then(() => device.transferIn(0x02, 100))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to icc power on');
            }
        })

        // get parameters
        .then(() => device.transferOut(0x02, Uint8Array.from([0x6C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00])))
        .then(() => device.transferIn(0x02, 100))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to get parameters');
            }

            // check for T-1 protocol
            if (resp.data.getUint8(9) !== 1) {
                throw new Error('Only T-1 protocol is supported');
            }

            // I don't know what the other fields mean so let's just assume its fine.
        })

        // set parameters (I have no idea what the parameters mean but whatever, it works)
        // I think this sets protocol T=1
        .then(() => device.transferOut(0x02, Uint8Array.from([0x61, 0x07, 0x00, 0x00, 0x00, 0x00, 0x02, 0x01, 0x00, 0x00, 0x11, 0x10, 0x00, 0x15, 0x00, 0xFE, 0x00])))
        .then(() => device.transferIn(0x02, 100))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to set parameters');
            }
        })

        // send an abort for whatever reason
        .then(() => device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x01, // abort
            value: 0x0200, // seq 2, slot 0
            index: 0x0002 // interface 2
        }, Uint8Array.from([])))

        .then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x00, 0x00,
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
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to select file');
            }

            // the data returned is 90 00
            // this might just mean okay!
        })
        .then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x11, 0x04, 0x00, 0x00,
            0x00,
            // GET DATA
            0xCA,
            // URL of public key (https://gnupg.org/ftp/specs/openpgp-card-1.1.pdf)
            // only the value is returned because it is a simple request
            0x5F, 0x50,
            0x00])))
        .then(() => device.transferIn(0x02, 2065))
        .then(resp => {
            // the response should contain the public key
            // abData starts at field 10
            // and goes until the last two status bytes 90 00
            let str = "";
            for (let i = 10; i < resp.data.byteLength - 2; ++i) {
                str += String.fromCharCode(resp.data.getUint8(i));
            }
            console.log(str);
        })
        .catch(error => {
            alert('Error getting public key');
            debugger;
        });
}
function decrypt() {
    let device;
    let pin = '123456';
    navigator.usb.requestDevice({ filters: [{ vendorId: 0x1050 }] })
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
                0x00,
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
            // push the pin chars on the back
            for (let i = 0; i < pin.length; ++i) {
                xfrBlock.push(pin.charCodeAt(i));
            }
            device.transferOut(0x02, Uint8Array.from(xfrBlock));
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to verify pin');
            }

            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Unable to verify pin');
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
                0x01,
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
            // push the pin chars on the back
            for (let i = 0; i < pin.length; ++i) {
                xfrBlock.push(pin.charCodeAt(i));
            }
            device.transferOut(0x02, Uint8Array.from(xfrBlock));
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to verify pin');
            }

            // check for the 90 00 return
            if (resp.data.getUint8(10) !== 0x90 || resp.data.getUint8(11) !== 0) {
                throw new Error('Unable to verify pin');
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
                0x02,
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
            ];
            // put the length on
            payload.push(cryptogram[0]);
            // 1 byte padding for RSA per https://gnupg.org/ftp/specs/OpenPGP-smart-card-application-2.1.pdf page 29
            payload.push(0);
            for (let i = 1; i < 254; ++i) {
                payload.push(cryptogram[i]);
            }
            device.transferOut(0x02, Uint8Array.from(payload))
        })
        .then(() => device.transferIn(0x02, 65556))
        .then(resp => {
            // check that byte 8 is 00 meaning no error
            if (resp.data.getUint8(7) !== 0) {
                throw new Error('Unable to push cryptogram');
            }

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
                0x02,
                0x00, 0x00, 0x00,
                // apdu stuff
                0x00,
                0x2A, 0x80, 0x86,
                // size 3
                cryptogram.length - cryptogram[0],
            ];
            // this will break for longer cryptograms :(
            for (let i = cryptogram[0]; i < cryptogram.length; ++i) {
                payload.push(cryptogram[i]);
            }
            // terminating 0
            payload.push(0);
            device.transferOut(0x02, Uint8Array.from(payload))
        })
        // TODO poll for results and then pull in the DEK
        .catch(error => {
            alert('Error decrypting');
            debugger;
        });
}

class App extends Component {
    readFile = e => {
        let comp = this;
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = function(e) {
            let arrayBuffer = reader.result;
            // index 14 is the length, the start of the cryptogram
            // but we always send 256 bytes
            cryptogram = new Uint8Array(arrayBuffer, 14, 257);
        }
        reader.readAsArrayBuffer(file);
    }

    render() {
        return (
            <div className="App">
                <button onClick={ decrypt }>USB</button>
                <input type="file" onChange={ this.readFile } />
            </div>
            );
    }
}

export default App;
