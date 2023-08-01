// Libraries
const ipc = require("electron").ipcRenderer;
const { IPCMessages } = require("../JS/Messages.js");
const { UpdateMessenger, initialize_message_display } = require("../JS/MainWindow2/Libraries/UpdateMessenger.js");
const wavemeter = require("bindings")("wavemeter");
const { ImageManagerMessenger } = require("../JS/MainWindow2/Libraries/ImageManager.js");
const { DetachmentLaserManagerMessenger } = require("../JS/MainWindow2/Libraries/DetachmentLaserManager.js");
const { ExcitationLaserManagerMessenger } = require("../JS/MainWindow2/Libraries/ExcitationLaserManager.js");

let settings; // Global variable, to be filled in on startup

const IMMessenger = new ImageManagerMessenger();
const DLMMessenger = new DetachmentLaserManagerMessenger();
const ELMMessenger = new ExcitationLaserManagerMessenger();

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
	process_settings();
	startup();
});

async function startup() {
	const { Tabs } = require("../JS/MainWindow2/Libraries/Tabs.js");
	const { Tab_Control, change_tab, PageInfo } = require("../JS/MainWindow2/tabInterface.js");
	const { Sevi_Load_Page } = require("../JS/MainWindow2/seviInterface.js");
	const { IRSevi_Load_Page } = require("../JS/MainWindow2/irseviInterface.js");
	const { IRAction_Load_Page } = require("../JS/MainWindow2/iractionInterface.js");

	// Initialize message display
	initialize_message_display(document.getElementById("MessageDisplay"));
	// Load Tab Content startup functions
	Tab_Control();
	Sevi_Load_Page(PageInfo);
	IRSevi_Load_Page(PageInfo);
	IRAction_Load_Page(PageInfo);

	// Go to Sevi Mode tab
	change_tab(Tabs.SEVI); // From interface.js
	//uiEmitter.emit(UI.UPDATE.TAB, UI.TAB.SEVI);

	// Set starting image ID to 1
	IMMessenger.update.id.set(1);

	initialize_mac_fn();

	ipc.send(IPCMessages.LOADED.MAINWINDOW, null);
}

function process_settings() {
	// Send settings to each manager
	IMMessenger.update.process_settings(settings);
	DLMMessenger.update.process_settings(settings);
	ELMMessenger.update.process_settings(settings);
}

/* Functions for simulating wavemeter on Mac */

/**
 * This function is called solely from C++ file (wavemeter_mac.cc)
 * 	to simulate the wavemeter
 * Return a wavelength close to OPO's wavelength
 */
function mac_wavelength(channel) {
	if (channel === settings.laser.detachment.wavemeter_channel) {
		// Just send 650nm (with some noise) as the detachment laser wavelength
		return 650 + norm_rand(0, 0.01);
	} else if (channel === settings.laser.excitation.wavemeter_channel) {
		// Send wavelength as the OPO's wavelength with some noise added
		let wl = 745; //opo.status.current_wavelength;
		// Add some noise
		wl += norm_rand(0, 0.1);
		// Small chance of wavelength being very far off
		if (Math.random() < 0.1) {
			wl -= 20;
		}
		return wl;
	} else {
		return -6; // Wavemeter's error for channel not available
	}
}

/**
 * Initialize JS function on C++ side
 */
function initialize_mac_fn() {
	wavemeter.setUpFunction(mac_wavelength);
}

/**
 * Random number with normal distribution
 * @param {Number} mu - center of normal distribution (mean)
 * @param {Number} sigma - width of normal distribution (sqrt(variance))
 * @returns {Number} random number
 */
function norm_rand(mu, sigma) {
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();
	return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) + mu;
}
