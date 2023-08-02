/*			Libraries					*/

const ipc = require("electron").ipcRenderer;
const EventEmitter = require("events").EventEmitter;
const camera = require("bindings")("camera");
const { IPCMessages } = require("../JS/Messages.js");

//
/*			Event Listeners				*/
//

//window.onload = function () {
//	startup();
//};

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send("invisible-window-ready", null);
};

//
/*			Centroid variables			*/
//

let settings;

let check_messages = false;

// Don't send centroid info for the first 2.5s so that the rest of the program can load
let send_centroid_info = false;
setTimeout(() => {
	send_centroid_info = true;
}, 2500);

//
/*			Centroid functions			*/
//

function startup() {
	let nRet; // Temp variable for success of camera commands

	const emitter = new EventEmitter(); // Emit messages between C++ and JS

	// Set up emitter messages
	emitter.on("new-image", (centroid_results) => {
		if (!centroid_results) {
			return;
		}

		// Send data to other renderer windows
		if (send_centroid_info) {
			ipc.send(IPCMessages.UPDATE.NEWFRAME, centroid_results);
		}
	});

	// Initialize emitter
	camera.initEmitter(emitter.emit.bind(emitter));

	// Connect to the camera
	nRet = camera.connect();
	console.log("Connect to camera:", nRet);

	// Get camera info
	let camInfo = camera.getInfo();
	console.log("Camera info: ", camInfo);

	// Adjust camera settings
	nRet = camera.applySettings();
	console.log("Apply settings:", nRet);

	// Initialize buffer
	camera.initBuffer();

	// Create WinAPI Window (to receive camera trigger messages)
	nRet = camera.createWinAPIWindow();
	console.log("Create window:", nRet);

	// Set AoI (Change later to be done with settings file)
	camera.setAoI(768, 768, 100, 0); // (AoI-Width, AoI-Height, left-offset, top-offset)

	// Set IR LED areas
	camera.setLEDArea(0, 100, 250, 450); // (x-start, x-end, y-start, y-end)
	camera.setNoiseArea(0, 100, 0, 250); // (x-start, x-end, y-start, y-end)

	// Start processing images
	if (camera.enableMessages()) {
		console.log("Messages enabled");
		check_messages = true;
		message_loop();
	}
}

function message_loop() {
	if (check_messages) {
		setTimeout(() => {
			// Re-execute this function at the end of event loop cycle
			message_loop();
		}, 0);
		//check_messages = false;
		camera.checkMessages();
	}
}

// End the message loop and close the camera
function close_camera() {
	check_messages = false;
	camera.close();
	console.log("Camera Closed!");
}

//
/*			Messengers				*/
//

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
	startup();
});

// Turn on / off hybrid method
ipc.on("hybrid-method", function (event, message) {
	//centroid.useHybrid(message);
});

ipc.on("close-camera", function (event, message) {
	close_camera();
	ipc.send("camera-closed", null);
});
