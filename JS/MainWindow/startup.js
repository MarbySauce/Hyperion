// Libraries
const { performance } = require("perf_hooks");
const fs = require("fs");
const path = require("path");
const ipc = require("electron").ipcRenderer;
const { EventEmitter, once } = require("events").EventEmitter;
const Chart = require("chart.js");
// OPO/A is controlled through TCP communication, which is done through JS module Net
const net = require("net");
// Addon libraries
const wavemeter = require("bindings")("wavemeter");
const { IPCMessages, UI, SEVI, MSG } = require("../JS/Messages.js");

let settings; // Global variable, to be filled in on startup

const seviEmitter = new EventEmitter();
const uiEmitter = new EventEmitter();
const msgEmitter = new EventEmitter();
// NOTE TO MARTY: I might need to worry about max listeners for emitters

// ORDER OF OPERATIONS WHEN LOADING PROGRAM
// Main renderer (main.js) creates the MainWindow
// Once the MainWindow window is ready, it notifies the main renderer
// Main then sends the settings to MainWindow
// Settings are received & processed, then startup() is called
// At the end of startup(), main is notified of window being loaded
// Main then shows the MainWindow window to the user

// Window is ready
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send(IPCMessages.READY.MAINWINDOW, null);
	//uiEmitter.emit(UI.CHANGE.TAB);
};

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;

	// Process settings (should make its own function)
	//if (settings.opo.host) {
	//	opo.network.config.host = settings.opo.host;
	//}

	startup();
});

async function startup() {
	// Go to Sevi Mode tab
	uiEmitter.emit(UI.CHANGE.TAB, UI.TAB.SEVI);

	ipc.send(IPCMessages.LOADED.MAINWINDOW, null);
}

/**
 * Asynchronous sleep function
 * @param {Number} delay_ms - delay time in milliseconds
 * @returns resolved promise upon completion
 */
async function sleep(delay_ms) {
	return new Promise((resolve) => setTimeout(resolve, delay_ms));
}

/*

Here is an example of how to wait for multiple pieces of information at once
values will be an array with the returned values from t1 and t2

*/

const bsEmitter = new EventEmitter();

async function testbs() {
	let t1 = once(bsEmitter, "test1");
	let t2 = once(bsEmitter, "test2");
	[t1, t2] = await Promise.all([t1, t2]); // Promises are replaced with the returned values
	console.log(t1, t2);
}

function test1() {
	bsEmitter.emit("test1", "this is test 1");
}
function test2() {
	bsEmitter.emit("test2", "this is test 2");
}
