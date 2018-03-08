/* global u2f */

// taken straight from https://github.com/tstranex/u2f/blob/master/u2fdemo/main.go
export function checkError(resp) {
    if (!('errorCode' in resp)) {
        return false;
    }
    if (resp.errorCode === u2f.ErrorCodes['OK']) {
        return false;
    }
    let msg = 'U2F error code ' + resp.errorCode;
    for (let name in u2f.ErrorCodes) {
        if (u2f.ErrorCodes[name] === resp.errorCode) {
            msg += ' (' + name + ')';
        }
    }
    if (resp.errorMessage) {
        msg += ': ' + resp.errorMessage;
    }
    console.error(msg);
    return true;
}
