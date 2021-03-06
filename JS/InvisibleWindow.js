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

let checkMessageBool = false;
let buffer;

//
/*			Centroid functions			*/
//

// Startup
function Startup_old() {
	const emitter = new EventEmitter();

	// Initialize buffer
	buffer = camera.initBuffer();

	// Set up emitter messages
	emitter.on("new-image", (centroidResults) => {
		if (!centroidResults) {
			return;
		}
		const centroids = centroidResults.slice(0, 2);
		const computationTime = centroidResults[2];
		const CentroidData = {
			imageBuffer: buffer,
			calcCenters: centroids,
			computeTime: computationTime,
		};

		// Send data to other renderer windows
		ipc.send("new-camera-frame", CentroidData);
	});

	// Initialize emitter
	camera.initEmitter(emitter.emit.bind(emitter));

	// Create WinAPI Window (to receive camera trigger messages)
	let nRet = camera.createWinAPIWindow();
	console.log("Create window:", nRet);

	// Connect to the camera
	nRet = camera.connect();
	console.log("Connect to camera:", nRet);

	// Adjust camera settings
	nRet = camera.applySettings();
	console.log("Apply settings:", nRet);
}

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
}

function messageLoop() {
	if (checkMessageBool) {
		setTimeout(() => {
			// Re-execute this function at the end of event loop cycle
			messageLoop();
		}, 0);
		//checkMessageBool = false;
		camera.checkMessages();
	}
}

// End the message loop and close the camera
function closeCamera() {
	checkMessageBool = false;
	camera.close();
	console.log("Camera Closed!");
}

//
/*			Messengers				*/
//

ipc.on("StartCentroiding", function (event, arg) {
	// Enable messages
	setTimeout(() => {
		if (camera.enableMessages()) {
			console.log("Messages enabled");
			checkMessageBool = true;
			messageLoop();
		}
		//let nRet = camera.enableMessages();
		//console.log("Enable messages:",nRet);
	}, 1000 /* ms */);
});

ipc.on("StopCentroiding", function (event, arg) {
	checkMessageBool = false;
});

// Turn on / off hybrid method
ipc.on("HybridMethod", function (event, message) {
	//centroid.useHybrid(message);
});

ipc.on("CloseCamera", function (event, message) {
	closeCamera();
	ipc.send("CameraClosed", null);
});
