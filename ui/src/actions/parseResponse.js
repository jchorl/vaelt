import { Map, fromJS } from "immutable";

export function jsonResponse(dispatch, success, failure) {
  return function(resp) {
    if (resp.ok) {
      return resp.json().then(
        json => {
          if (success) {
            return dispatch(success(fromJS(json)));
          }
          return fromJS(json);
        },
        error => {
          const m = Map({
            message: error.message || "An unknown error occurred",
          });
          if (failure) {
            dispatch(failure(m));
          }
          return Promise.reject(m);
        }
      );
    }

    return resp.text().then(text => {
      try {
        const parsed = JSON.parse(text);
        const m = Map(parsed);
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      } catch (e) {
        const m = Map({ message: text || "An unknown error occurred" });
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      }
    });
  };
}

export function stringResponse(dispatch, success, failure) {
  return function(resp) {
    if (resp.ok) {
      return resp.text().then(
        text => {
          if (success) {
            return dispatch(success(text));
          }
          return text;
        },
        error => {
          const m = Map({
            message: error.message || "An unknown error occurred",
          });
          if (failure) {
            dispatch(failure(m));
          }
          return Promise.reject(m);
        }
      );
    }

    return resp.text().then(text => {
      try {
        const parsed = JSON.parse(text);
        const m = Map(parsed);
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      } catch (e) {
        const m = Map({ message: text || "An unknown error occured" });
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      }
    });
  };
}

export function noContentResponse(dispatch, success, failure) {
  return function(resp) {
    if (resp.ok) {
      return resp.text().then(
        () => {
          if (success) {
            return dispatch(success());
          }
        },
        error => {
          let m = Map({
            message: error.message || "An unknown error occurred",
          });
          if (failure) {
            dispatch(failure(m));
          }
          return Promise.reject(m);
        }
      );
    }

    return resp.text().then(text => {
      try {
        const parsed = JSON.parse(text);
        const m = Map(parsed);
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      } catch (e) {
        const m = Map({ message: text || "An unknown error occurred" });
        if (failure) {
          dispatch(failure(m));
        }
        return Promise.reject(m);
      }
    });
  };
}

export function reqFailure(dispatch, failure) {
  return function(error) {
    const m = Map({ message: error.message || "An unknown error occurred" });
    if (failure) {
      dispatch(failure(m));
    }
    return Promise.reject(m);
  };
}
