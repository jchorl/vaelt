.then(() => device.controlTransferIn({
                    requestType: 'standard',
                    recipient: 'device',
                    request: 0x00,
                    value: 0x0000,
                    index: 0x0000}, 0))
.then(resp => console.log(resp))
.then(() => device.controlTransferIn({
                    requestType: 'standard',
                    recipient: 'device',
                    request: 0x00,
                    value: 0x0000,
                    index: 0x0000}, 0))
.then(resp => console.log(resp))
.then(() => device.controlTransferIn({
                    requestType: 'standard',
                    recipient: 'device',
                    request: 0x00,
                    value: 0x0000,
                    index: 0x0000}, 0))
.then(resp => console.log(resp))
.then(() => device.controlTransferIn({
                    requestType: 'standard',
                    recipient: 'device',
                    request: 0x00,
                    value: 0x0000,
                    index: 0x0000}, 0))
.then(resp => console.log(resp))
.then(() => device.controlTransferIn({
                    requestType: 'standard',
                    recipient: 'device',
                    request: 0x00,
                    value: 0x0000,
                    index: 0x0000}, 0))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 28))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 17))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x61, 0x07, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x00, 0x00, 0x11, 0x10, 0x00, 0x15, 0x00, 0xFE, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.controlTransferOut({
                    requestType: 'class',
                    recipient: 'interface',
                    request: 0x01,
                    value: 0x0300,
                    index: 0x0002}, Uint8Array.from([])))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x07, 0x00, 0x00, 0x00, 0x00, 0x05, 0x04, 0x00, 0x00, 0x00, 0xA4, 0x00, 0x0C, 0x02, 0x3F, 0x00])))
.then(() => device.transferIn(0x02, 12))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x0B, 0x00, 0x00, 0x00, 0x00, 0x06, 0x04, 0x00, 0x00, 0x00, 0xA4, 0x04, 0x00, 0x06, 0xD2, 0x76, 0x00, 0x01, 0x24, 0x01])))
.then(() => device.transferIn(0x02, 12))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x07, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x4F, 0x00])))
.then(() => device.transferIn(0x02, 28))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x08, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x5F, 0x52, 0x00])))
.then(() => device.transferIn(0x02, 20))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x09, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0xC4, 0x00])))
.then(() => device.transferIn(0x02, 19))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x6E, 0x00])))
.then(() => device.transferIn(0x02, 236))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0B, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x7F, 0x74, 0x00])))
.then(() => device.transferIn(0x02, 15))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x5E, 0x00])))
.then(() => device.transferIn(0x02, 12))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x6E, 0x00])))
.then(() => device.transferIn(0x02, 236))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0E, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x6E, 0x00])))
.then(() => device.transferIn(0x02, 236))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x0F, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x6E, 0x00])))
.then(() => device.transferIn(0x02, 236))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x10, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x65, 0x00])))
.then(() => device.transferIn(0x02, 23))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x11, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x5F, 0x50, 0x00])))
.then(() => device.transferIn(0x02, 91))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x12, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x6E, 0x00])))
.then(() => device.transferIn(0x02, 236))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x13, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0xC4, 0x00])))
.then(() => device.transferIn(0x02, 19))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x14, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x00, 0x7A, 0x00])))
.then(() => device.transferIn(0x02, 19))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x15, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x01, 0x01, 0x00])))
.then(() => device.transferIn(0x02, 12))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x16, 0x04, 0x00, 0x00, 0x00, 0xCA, 0x01, 0x02, 0x00])))
.then(() => device.transferIn(0x02, 12))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x08, 0x00, 0x00, 0x00, 0x00, 0x17, 0x04, 0x00, 0x00, 0x00, 0x47, 0x81, 0x00, 0x02, 0xB6, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 266))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x18, 0x04, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0xFF])))
.then(() => device.transferIn(0x02, 267))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x19, 0x04, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x11])))
.then(() => device.transferIn(0x02, 29))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x08, 0x00, 0x00, 0x00, 0x00, 0x1A, 0x04, 0x00, 0x00, 0x00, 0x47, 0x81, 0x00, 0x02, 0xB8, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 266))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x1B, 0x04, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x10])))
.then(() => device.transferIn(0x02, 28))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x08, 0x00, 0x00, 0x00, 0x00, 0x1C, 0x04, 0x00, 0x00, 0x00, 0x47, 0x81, 0x00, 0x02, 0xA4, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 266))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x1D, 0x04, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0xFF])))
.then(() => device.transferIn(0x02, 267))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x6F, 0x05, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x04, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x11])))
.then(() => device.transferIn(0x02, 29))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x22, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x23, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
.then(() => device.transferOut(0x02, Uint8Array.from([0x65, 0x00, 0x00, 0x00, 0x00, 0x00, 0x24, 0x00, 0x00, 0x00])))
.then(() => device.transferIn(0x02, 10))
.then(resp => console.log(resp))
