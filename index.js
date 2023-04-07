import { subscribe, snapshot } from 'valtio'
import WebSocket from 'isomorphic-ws';
let ws;
let proxy;
let options;
let connecting = false;
let connected = false;
let detectHotReload = Math.random();  
function connectToWs() {
    if (window.detectHotReload != detectHotReload) {
        //Prevent running multiple times on hot reload
        return;
    }
    if (connecting == false) { 
        connecting = true;
        //Connect to websocket server (if not already)
        console.log(`Trying to connect to valtio devtools on ${options.host}:${options.port}...`)
        ws = new WebSocket(`ws://${options.host}:${options.port || 5679}`);
        ws.onopen = function open() {
            console.log('Connected to valtio devtools.')
            connected = true;
            const obj = snapshot(proxy) // A snapshot is an immutable object
            setTimeout(() => {
                ws.send(
                    JSON.stringify(obj)
                );
            }, 500)
        };  
        ws.onclose = function close() {
            if (connected) console.log('Disconnected from valtio devtools.');
            connecting = false;
            connected = false;
            setTimeout(() => connectToWs(), 1000);
        };
        ws.onmessage = function incoming(msg) {
            //TODO process edits from devtools?
        };
    }
}
export default function init (state, _options) {
    proxy = state;
    window.detectHotReload = detectHotReload;
    options = _options || {};
    if (options.host == null) {
        options.host = 'localhost';
        if (options.remote) {
            try {
                options.host = __IP_ADDRESS__;
            } catch (err) {
                console.warn('valtio-devtools-client: "babel-plugin-ip-address" not installed/configured.')
            }
        }
    }
    if (options.port == null) options.port = 5679;
    connectToWs()
    subscribe(proxy, (change) => {
        const obj = snapshot(proxy)
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(
                    JSON.stringify(obj)
                );
            } catch (err) {
                console.log('err', err)
            }
        }
    })
}