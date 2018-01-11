import React, { Component } from 'react';
import './App.css';

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
                throw new Error('Unable to get parameters');
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
                throw new Error('Unable to get parameters');
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

class App extends Component {
    render() {
        return (
            <div className="App">
                <button onClick={getPublicKey}>USB</button>
            </div>
            );
    }
}

export default App;
