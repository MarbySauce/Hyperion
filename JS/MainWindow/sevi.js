/*****************************************************************************

								Image Manager

*****************************************************************************/

// This is what manages all the VMI images, taking in requests from UI, Camera, etc

const ImageManager = {
	status: {
		running: false,
		paused: false,
	},
	all_images: [],
	current_image: undefined,
	start_scan: (id) => ImageManager_start_scan(id),
};

seviEmitter.on(SEVI.SCAN.START, ImageManager.start_scan);

seviEmitter.on(SEVI.QUERY.SCAN.RUNNING, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.RUNNING, ImageManager.status.running);
});
seviEmitter.on(SEVI.QUERY.SCAN.PAUSED, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.PAUSED, ImageManager.status.paused);
});

uiEmitter.on(UI.INFO.RESPONSE.IMAGEID, (image_id) => {
	if (ImageManager.current_image) {
		ImageManager.current_image.id = image_id;
	}
});
uiEmitter.on(UI.INFO.RESPONSE.VMIINFO, (vmi_info) => {
	if (ImageManager.current_image) {
		console.log(vmi_info);
		ImageManager.current_image.vmi_info = vmi_info;
	}
});

function ImageManager_start_scan(id) {
	if (ImageManager.status.running) {
		// Image is already running, do nothing
		return;
	}
	let new_image = new Image(id);
	ImageManager.all_images.push(new_image);
	ImageManager.current_image = new_image;
	ImageManager.status.running = true;
	// Alert that a new image has been started
	seviEmitter.emit(SEVI.ALERT.SCAN.STARTED);
	// Get info about image
	ImageManager_get_image_info();
}

function ImageManager_stop_scan() {
	if (!ImageManager.status.running) {
		// An image is not running, do nothing
		return;
	}
	// Stop image and alert that it has been stopped
	ImageManager.status.running = false;
	ImageManager.status.paused = false;
	seviEmitter.emit(SEVI.ALERT.SCAN.STOPPED);
	// Save image to file
	ImageManager.current_image.save_image();
	// Remove image from current_image position
	ImageManager.current_image = undefined;
}

function ImageManager_get_image_info() {
	uiEmitter.emit(UI.INFO.QUERY.IMAGEID);
	uiEmitter.emit(UI.INFO.QUERY.VMIINFO);
}

/*****************************************************************************

								VMI IMAGES

*****************************************************************************/

// This is the class for an image that is *currently* being collected
//		FinishedImage is the class generated after which is for images that were collected and have stopped
class Image {
	constructor(id) {
		this.id = id;
		//this.id_str = ("0" + image_id).slice(-2); // ID stored as a 2 digit string

		this.counts = {
			electrons: {
				on: 0,
				off: 0,
				total: 0,
			},
			frames: {
				on: 0,
				off: 0,
				total: 0,
			},
		};
	}

	update_id(id) {
		this.id = id;
	}

	save_image() {
		console.log("Image has been saved! (Not really)");
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
