/*			Libraries					*/

const ipc = require("electron").ipcRenderer;
const EventEmitter = require("events").EventEmitter;
const camera = require("bindings")("camera");

//
/*			Event Listeners				*/
//

window.onload = function () {
	Startup();
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
function Startup() {
	const emitter = new EventEmitter();

	// Initialize buffer
	buffer = camera.initBuffer();
	console.log(buffer);

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
		ipc.send("LVImageUpdate", CentroidData);
	});

	// Initialize emitter
	camera.initEmitter(emitter.emit.bind(emitter));

	// Create WinAPI Window (to receive camera trigger messages)
	let nRet = camera.createWinAPIWindow();
	console.log("Create window:",nRet);

	// Connect to the camera
	nRet = camera.connect();
	console.log("Connect to camera:", nRet);

	// Adjust camera settings
	nRet = camera.applySettings();
	console.log("Apply settings:", nRet);

}

function messageLoop() {
	if (checkMessageBool) {
		setTimeout(() => {
			// Re-execute this function at the end of event loop cycle
			messageLoop();
		}, 0);
		camera.checkMessages();
	}
}

//
/*			Messengers				*/
//

ipc.on("StartCentroiding", function (event, arg) {
	// Enable messages
	setTimeout(() => {
		if(camera.enableMessages()) {
			console.log("Messages enabled");
			checkMessageBool = true;
			messageLoop();
		}
	}, 5000 /* ms */);
});

ipc.on("StopCentroiding", function (event, arg) {
	checkMessageBool = false;
});

// Turn on / off hybrid method
ipc.on("HybridMethod", function (event, message) {
	//centroid.useHybrid(message);
});
