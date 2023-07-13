// Libraries
const { performance } = require("perf_hooks");
const fs = require("fs");
const path = require("path");
const ipc = require("electron").ipcRenderer;
const EventEmitter = require("events").EventEmitter;
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

// Window loaded
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send(IPCMessages.READY.MAINWINDOW, null);
	uiEmitter.emit(UI.CHANGE.TAB);
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

function startup() {
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
