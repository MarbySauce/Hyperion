/*			Libraries					*/

const ipc = require("electron").ipcRenderer;
const EventEmitter = require("events").EventEmitter;
const camera = require("bindings")("camera");

//
/*			Event Listeners				*/
//

window.onload = function () {
	startup();
};

//
/*			Centroid variables			*/
//

let check_messages = false;
let buffer;

//
/*			Centroid functions			*/
//

function startup() {
	let nRet; // Temp variable for success of camera commands

	const emitter = new EventEmitter(); // Emit messages between C++ and JS

	// Set up emitter messages
	emitter.on("new-image", (centroidResults) => {
		if (!centroidResults) {
			return;
		}
		centroidResults.imageBuffer = buffer;

		// Send data to other renderer windows
		ipc.send("new-camera-frame", centroidResults);
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
	buffer = camera.initBuffer();

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
		messageLoop();
	}
}

function messageLoop() {
	if (check_messages) {
		setTimeout(() => {
			// Re-execute this function at the end of event loop cycle
			messageLoop();
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

// Turn on / off hybrid method
ipc.on("hybrid-method", function (event, message) {
	//centroid.useHybrid(message);
});

ipc.on("close-camera", function (event, message) {
	close_camera();
	ipc.send("camera-closed", null);
});
