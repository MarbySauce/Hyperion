const seviEmitter = new EventEmitter();

const SEVI = {
	QUERY: {
		SCAN: {
			RUNNING: "SEVI-QUERY-SCAN-RUNNING",
			PAUSED: "SEVI-QUERY-SCAN-PAUSED",
		},
	},
	RESPONSE: {
		SCAN: {
			RUNNING: "SEVI-RESPONSE-SCAN-RUNNING",
			PAUSED: "SEVI-RESPONSE-SCAN-PAUSED",
		},
	},
	ALERT: {
		SCAN: {
			STARTED: "SEVI-RESPONSE-SCAN-STARTED",
			STOPPED: "SEVI-RESPONSE-SCAN-STOPPED",
			PAUSED: "SEVI-RESPONSE-SCAN-PAUSED",
			RESUMED: "SEVI-RESPONSE-SCAN-RESUMED",
			CANCELED: "SEVI-RESPONSE-SCAN-CANCELED",
			RESET: "SEVI-RESPONSE-SCAN-RESET",
		},
	},
	SCAN: {
		START: "SEVI-SCAN-START",
		STOP: "SEVI-SCAN-STOP",
		PAUSE: "SEVI-SCAN-PAUSE",
		RESUME: "SEVI-SCAN-RESUME",
		CANCEL: "SEVI-SCAN-CANCEL",
		RESET: "SEVI-SCAN-RESET",
		SINGLESHOT: "SEVI-SCAN-SINGLESHOT",
	},
};

let sevi_scan_running = false;
let sevi_scan_paused = false;

// These are bullshit for now

// Current idea is to have the scans that are currently running being the ones that respond to queries
//	Using class structure from before
// Need to come up with dealing with queries when there aren't scans then

// if emit(event) doesn't have any listeners, it returns false!

seviEmitter.on(SEVI.SCAN.START, () => {
	sevi_scan_running = true;
	seviEmitter.emit(SEVI.ALERT.SCAN.STARTED);
});
seviEmitter.on(SEVI.SCAN.STOP, () => {
	sevi_scan_running = false;
	seviEmitter.emit(SEVI.ALERT.SCAN.STOPPED);
});

/*****************************************************************************

								VMI IMAGES

*****************************************************************************/

// This is the class for an image that is *currently* being collected
//		FinishedImage is the class generated after which is for images that were collected and have stopped
class Image {
	constructor() {
		this.id = -1;
		//this.id_str = ("0" + image_id).slice(-2); // ID stored as a 2 digit string

		this.paused = true;

		this.counts = {
			electrons: {
				on: 0,
				off: 0,
			},
			frames: {
				on: 0,
				off: 0,
			},
		};

		// Request information about this image
		uiEmitter.on(UI.INFO.RESPONSE.IMAGEID, this.emitter_image_id_update);
		uiEmitter.emit(UI.INFO.QUERY.IMAGEID); // Request Image ID

		// Set up event listeners
		seviEmitter.on(SEVI.QUERY.SCAN.RUNNING, this.running_response);
		seviEmitter.on(SEVI.QUERY.SCAN.PAUSED, this.paused_response);
	}

	testvar = 1;

	running_response() {
		seviEmitter.emit(SEVI.RESPONSE.SCAN.RUNNING, true);
	}

	paused_response() {
		seviEmitter.emit(SEVI.RESPONSE.SCAN.PAUSED, this.paused);
	}

	emitter_image_id_update(id) {
		console.log(id, testvar);
	}

	update_id(id) {
		this.id = id;
	}

	delete_emitters() {
		seviEmitter.removeListener(SEVI.QUERY.SCAN.RUNNING, this.running_response);
		seviEmitter.removeListener(SEVI.QUERY.SCAN.PAUSED, this.paused_response);
		seviEmitter.removeListener(UI.INFO.RESPONSE.IMAGEID, this.image_id_update);
	}
}

// Class for images that have been collected and are no longer collecting data
class FinishedImage {
	constructor(image_id) {}
}

seviEmitter.on("test_response", () => {
	console.log("Test response responding");
});

function test1() {
	let retval = seviEmitter.emit("test_response");
	if (retval) console.log("test_response has a response");
	else console.log("test_response has no response");

	let retval2 = seviEmitter.emit("test_no_response");
	if (retval2) console.log("test_no_response has a response");
	else console.log("test_no_response has no response");
}
