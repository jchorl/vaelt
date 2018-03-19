import React, { Component } from "react";
import openpgp from "openpgp";
import { getPublicKey, getDecryptionKey } from "./yubikey";

export default class YubikeyDemo extends Component {
  constructor() {
    super();
    this.state = { password: "" };

    openpgp.initWorker({ path: "openpgp.worker.min.js" }); // set the relative web worker path
  }

  handleChange = event => {
    this.setState({ password: event.target.value });
  };

  render() {
    return (
      <div>
        <button onClick={getPublicKey}>Get public key</button>
        <input
          type="password"
          value={this.state.password}
          onChange={this.handleChange}
        />
        <button onClick={() => getDecryptionKey(this.state.password)}>
          Get decryption key
        </button>
      </div>
    );
  }
}
