import React, { Component } from 'react';
import openpgp from 'openpgp';
import { getPublicKey, getDecryptionKey } from './yubikey';
import './App.css';

class App extends Component {
    constructor() {
        super();

        openpgp.initWorker({ path:'openpgp.worker.min.js' }); // set the relative web worker path
    }

    render() {
        return (
            <div className="App">
                <button onClick={ getPublicKey }>Get public key</button>
                <button onClick={ getDecryptionKey }>Get decryption key</button>
            </div>
            );
    }
}

export default App;
