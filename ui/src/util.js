export function uint8arrayToHexString(uint8array) {
    let strArr = [];
    let str = '';
    for (let i = 0; i < uint8array.length; ++i) {
        if (i % 16 === 0 && i > 0) {
            strArr.push(str);
            str = '';
        } else if (i % 8 === 0 && i > 0) {
            str += ' ';
        }
        if (i % 16 > 0) {
            str += ' ';
        }
        let numStr = uint8array[i].toString(16);
        if (numStr.length === 1) {
            numStr = '0' + numStr;
        }
        str += numStr;
    }
    strArr.push(str);
    return strArr;
}

export function arrayToHexString(arr) {
    let strArr = [];
    let str = '';
    for (let i = 0; i < arr.byteLength; ++i) {
        if (i % 16 === 0 && i > 0) {
            strArr.push(str);
            str = '';
        } else if (i % 8 === 0 && i > 0) {
            str += ' ';
        }
        if (i % 16 > 0) {
            str += ' ';
        }
        let numStr = arr.getUint8(i).toString(16);
        if (numStr.length === 1) {
            numStr = '0' + numStr;
        }
        str += numStr;
    }
    strArr.push(str);
    return strArr;
}
