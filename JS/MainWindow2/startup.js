// Libraries
const ipc = require("electron").ipcRenderer;
const { IPCMessages } = require("../JS/Messages.js");
const { UpdateMessenger, initialize_message_display } = require("../JS/MainWindow2/Libraries/UpdateMessenger.js");

// Doing this so my IDE can get the class information
// Couldn't figure out a better way to do it
try {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
} catch (error) {}
const { ImageManagerMessenger } = require("../JS/MainWindow2/Libraries/ImageManager.js");

let settings; // Global variable, to be filled in on startup

const IMMessenger = new ImageManagerMessenger();

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

	ipc.send(IPCMessages.LOADED.MAINWINDOW, null);
}

function process_settings() {
	// Send settings to each manager
	IMMessenger.update.process_settings(settings);
}

/**
 * Asynchronous sleep function
 * @param {Number} delay_ms - delay time in milliseconds
 * @returns resolved promise upon completion
 */
async function sleep(delay_ms) {
	return new Promise((resolve) => setTimeout(resolve, delay_ms));
}
