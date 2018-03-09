import { Map, fromJS } from 'immutable';

export function jsonResponse(dispatch, success, failure) {
    return function (resp) {
        if (resp.ok) {
            return resp.json().then(
                json => dispatch(success(fromJS(json))),
                error => {
                    const m = Map({ message: error.message });
                    dispatch(failure(m));
                    return Promise.reject(m);
                },
            );
        }

        return resp.text().then(
            text => {
                try {
                    const parsed = JSON.parse(text);
                    const m = Map(parsed);
                    dispatch(failure(m));
                    return Promise.reject(m);
                } catch (e) {
                    const m = Map({ message: text });
                    dispatch(failure(m));
                    return Promise.reject(m);
                }
            },
        );
    }
}

export function stringResponse(dispatch, success, failure) {
    return function (resp) {
        if (resp.ok) {
            return resp.text().then(
                text => dispatch(success(text)),
                error => {
                    const m = Map({ message: error.message });
                    dispatch(failure(m));
                    return Promise.reject(m);
                },
            );
        }

        return resp.text().then(
            text => {
                try {
                    const parsed = JSON.parse(text);
                    const m = Map(parsed);
                    dispatch(failure(m));
                    return Promise.reject(m);
                } catch (e) {
                    const m = Map({ message: text });
                    dispatch(failure(m));
                    return Promise.reject(m);
                }
            },
        );
    }
}

export function noContentResponse(dispatch, success, failure) {
    return function (resp) {
        if (resp.ok) {
            return resp.text().then(
                () => dispatch(success()),
                error => {
                    let m = Map({ message: error.message });
                    dispatch(failure(m));
                    return Promise.reject(m);
                },
            );
        }

        return resp.text().then(
            text => {
                try {
                    const parsed = JSON.parse(text);
                    const m = Map(parsed);
                    dispatch(failure(m));
                    return Promise.reject(m);
                } catch (e) {
                    const m = Map({ message: text });
                    dispatch(failure(m));
                    return Promise.reject(m);
                }
            },
        );
    }
}
