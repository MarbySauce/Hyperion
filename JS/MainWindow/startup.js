// Libraries
const ipc = require("electron").ipcRenderer;
const { IPCMessages } = require("../JS/Messages.js");
const { UpdateMessenger, initialize_message_display } = require("../JS/MainWindow/Libraries/UpdateMessenger.js");
const wavemeter = require("bindings")("wavemeter");
const { ImageManagerMessenger } = require("../JS/MainWindow/Libraries/ImageManager.js");
const { DetachmentLaserManagerMessenger } = require("../JS/MainWindow/Libraries/DetachmentLaserManager.js");
const { ExcitationLaserManagerMessenger } = require("../JS/MainWindow/Libraries/ExcitationLaserManager.js");
const { OPOManagerMessenger } = require("../JS/MainWindow/Libraries/OPOManager.js");

let settings; // Global variable, to be filled in on startup

const IMMessenger = new ImageManagerMessenger();
const DLMMessenger = new DetachmentLaserManagerMessenger();
const ELMMessenger = new ExcitationLaserManagerMessenger();
const OPOMMessenger = new OPOManagerMessenger();

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
	const { Tabs } = require("../JS/MainWindow/Libraries/Tabs.js");
	const { Tab_Control, Large_Display_Control, change_tab, PageInfo } = require("../JS/MainWindow/tabInterface.js");
	const { Sevi_Load_Page } = require("../JS/MainWindow/seviInterface.js");
	const { IRSevi_Load_Page } = require("../JS/MainWindow/irseviInterface.js");
	const { IRAction_Load_Page } = require("../JS/MainWindow/iractionInterface.js");

	// Initialize message display
	initialize_message_display(document.getElementById("MessageDisplay"));
	// Load Tab Content startup functions
	Tab_Control();
	Large_Display_Control();
	Sevi_Load_Page(PageInfo);
	IRSevi_Load_Page(PageInfo);
	IRAction_Load_Page(PageInfo);

	// Go to Sevi Mode tab
	change_tab(Tabs.SEVI); // From interface.js
	//uiEmitter.emit(UI.UPDATE.TAB, UI.TAB.SEVI);

	// Set starting image ID to 1
	IMMessenger.update.id.set(1);
	// Set starting VMI to V1
	IMMessenger.update.vmi_info({ mode: "V1" });

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
		let wl = ELMMessenger.opo.information.wavelength || 745;
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

async function test_ss() {
	const { access, writeFile } = require("fs/promises");
	const path = require("path");

	let save_dir = settings.save_directory.full_dir;

	let get_file_name = (id) => `single_shot_${id}.txt`;
	let id = 1;
	while (true) {
		let file_name = path.join(save_dir, get_file_name(id));
		console.log(`Trying file: ${get_file_name(id)}`);
		try {
			await access(file_name);
			// File exists. Increment id and continue
			id++;
		} catch {
			// If we're here, that file does not exist, save there
			try {
				await writeFile(file_name, "Hello there");
			} catch {
				console.log("writeFile failed");
			}
			break;
		}
		if (id > 4) break;
	}
	console.log("Done", id);
}

document.getElementById("IRActionResizeLeft").onclick = function () {
	const display_section = document.getElementById("IRActionSpectrumDisplaySection");
	display_section.classList.remove("resized-right");
	display_section.classList.add("resized-left");
};

document.getElementById("IRActionResizeCenter").onclick = function () {
	const display_section = document.getElementById("IRActionSpectrumDisplaySection");
	display_section.classList.remove("resized-right");
	display_section.classList.remove("resized-left");
};

document.getElementById("IRActionResizeRight").onclick = function () {
	const display_section = document.getElementById("IRActionSpectrumDisplaySection");
	display_section.classList.add("resized-right");
	display_section.classList.remove("resized-left");
};
