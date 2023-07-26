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
const { IPCMessages, UI, SEVI, IRACTION, LASER, MSG } = require("../JS/Messages.js");

let settings; // Global variable, to be filled in on startup

const seviEmitter = new EventEmitter();
const uiEmitter = new EventEmitter();
const msgEmitter = new EventEmitter();
const laserEmitter = new EventEmitter();
const actionEmitter = new EventEmitter();
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
};

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
	startup();
});

async function startup() {
	// Go to Sevi Mode tab
	uiEmitter.emit(UI.UPDATE.TAB, UI.TAB.SEVI);

	// Start wavemeter application
	wavemeter.startApplication();
	wavemeter.setReturnModeNew();
	// Set up Mac wavemeter simulation function
	initialize_mac_fn(); // From wavelength.js
	// Initialize OPO
	opo_startup(); // From wavelength.js

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


*/

async function testbs() {
	const NOTIFICATION_TITLE = "Title";
	const NOTIFICATION_BODY = "Notification from the Renderer process. Click to log to console.";
	const CLICK_MESSAGE = "Notification clicked!";

	new window.Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY }).onclick = () => {
		console.log(CLICK_MESSAGE);
	};
}
