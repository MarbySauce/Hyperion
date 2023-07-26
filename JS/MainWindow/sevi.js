/************************************************** 

			Control for SEVI / IR-SEVI

**************************************************/

const { Image, IRImage, EmptyIRImage } = require("../JS/MainWindow/seviClasses.js");

// This image is a place holder for ImageManager.current_image whenever a scan is not currently being taken
// That way the image functionality (such as returning file names) can still be used
const EmptyImage = new EmptyIRImage();

/*****************************************************************************

								IMAGE MANAGER

*****************************************************************************/

// This is what manages all the VMI images, taking in requests from UI, Camera, etc

const ImageManager = {
	status: {
		running: false,
		paused: false,
		isIR: false,
	},
	params: {
		display_slider_value: 0.5,
	},
	autostop: {
		method: SEVI.AUTOSTOP.METHOD.NONE,
		value: {
			electrons: Infinity,
			frames: Infinity,
		},
		use_autostop: false,
		both: false, // Whether both images (in IR-SEVI scan) need to meet autostop condition or just one
		progress: 0, // Percent completion, as value between 0 and 100
		check: () => ImageManager_autostop_check(),
		send_progress: () => {
			seviEmitter.emit(SEVI.RESPONSE.AUTOSTOP.PROGRESS, ImageManager.autostop.progress);
		},
		send_info: () => ImageManager_autostop_send_info(),
	},
	series: {
		collection_length: 1,
		progress: 0, // # of images in series taken
		update: (collection_length) => ImageManager_series_update(collection_length),
		send_progress: () => ImageManager_series_send_progress(),
	},
	all_images: [],
	current_image: EmptyImage, // Image that is currently being taken
	last_image: EmptyImage, // Last image that was taken
	start_scan: (is_ir) => ImageManager_start_scan(is_ir),
	stop_scan: () => ImageManager_stop_scan(),
	pause_resume_scan: () => ImageManager_pause_resume_scan(),
	cancel_scan: () => ImageManager_cancel_scan(),
	reset_scan: () => ImageManager_reset_scan(),
	get_image_info: () => ImageManager_get_image_info(),
	get_image_display: (which_image) => ImageManager_get_image_display(which_image),
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, (event, centroid_results) => {
	if (!ImageManager.status.running || ImageManager.status.paused) {
		return; // Don't update if an image is not running or is paused
	}
	ImageManager.current_image.update_counts(centroid_results);
	ImageManager.current_image.update_image(centroid_results);
	// Send updates about image and electron count information
	seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.current_image.counts);
	// Check if autostop condition has been met
	ImageManager.autostop.check();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.IMAGEID, (image_id) => {
	ImageManager.current_image.id = image_id;
	// Make sure file names also get updated
	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);
	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAMEIR);
});
uiEmitter.on(UI.RESPONSE.VMI, (vmi_info) => {
	ImageManager.current_image.vmi_info = vmi_info;
});

/****
		Laser Event Listeners
****/

// detachment_info will be a DetachmentWavelength class object
laserEmitter.on(LASER.RESPONSE.DETACHMENT.INFO, (detachment_info) => {
	ImageManager.current_image.detachment_wavelength = detachment_info;
});

// detachment_measurement will be a WavemeterMeasurement class object
laserEmitter.on(LASER.RESPONSE.DETACHMENT.MEASUREMENT, (detachment_measurement) => {
	ImageManager.current_image.detachment_measurement = detachment_measurement;
});

// excitation_info will be a ExcitationWavelength class object
laserEmitter.on(LASER.RESPONSE.EXCITATION.INFO, (excitation_info) => {
	ImageManager.current_image.excitation_wavelength = excitation_info;
});

// excitation_measurement will be a WavemeterMeasurement class object
laserEmitter.on(LASER.RESPONSE.EXCITATION.MEASUREMENT, (excitation_measurement) => {
	ImageManager.current_image.excitation_measurement = excitation_measurement;
});

/****
		SEVI Event Listeners
****/

/* Scan Control */

// Start SEVI or IR-SEVI scan
seviEmitter.on(SEVI.SCAN.START, () => {
	ImageManager.start_scan(false);
});
seviEmitter.on(SEVI.SCAN.STARTIR, () => {
	ImageManager.start_scan(true);
});
// Stop scan
seviEmitter.on(SEVI.SCAN.STOP, ImageManager.stop_scan);
// Pause or resume scan
seviEmitter.on(SEVI.SCAN.PAUSERESUME, () => {
	// Pause/Resume logic was moved here bc ImageManager should be figuring out what to do
	ImageManager.pause_resume_scan();
});
// Cancel scan
seviEmitter.on(SEVI.SCAN.CANCEL, ImageManager.cancel_scan);
// Reset scan
seviEmitter.on(SEVI.SCAN.RESET, ImageManager.reset_scan);

// Update image series collection parameter
seviEmitter.on(SEVI.UPDATE.SERIES.LENGTH, ImageManager.series.update);

// Update autostop parameters
seviEmitter.on(SEVI.UPDATE.AUTOSTOP, (autostop_params) => {
	// autostop_params will look like {method: (SEVI.AUTOSTOP.METHOD), value: (number)}
	// If only updating the method, autostop_params.value should be undefined
	// If only updating the value, autostop_params.method should be undefined
	// If updating both, neither .value or .method should be undefined
	if (autostop_params.method && autostop_params.value) {
		// Update both
		ImageManager.autostop.method = autostop_params.method;
		if (autostop_params.method === SEVI.AUTOSTOP.METHOD.ELECTRONS) {
			ImageManager.autostop.value.electrons = autostop_params.value;
		} else if (autostop_params.method === SEVI.AUTOSTOP.METHOD.FRAMES) {
			ImageManager.autostop.value.frames = autostop_params.value;
		}
	} else if (autostop_params.method) {
		// Only update method
		ImageManager.autostop.method = autostop_params.method;
	} else if (autostop_params.value) {
		// Only update value
		if (ImageManager.autostop.method === SEVI.AUTOSTOP.METHOD.ELECTRONS) {
			ImageManager.autostop.value.electrons = autostop_params.value;
		} else if (ImageManager.autostop.method === SEVI.AUTOSTOP.METHOD.FRAMES) {
			ImageManager.autostop.value.frames = autostop_params.value;
		}
	}
	// Update status of whether autostop is being used (method != none and value != infinity)
	switch (ImageManager.autostop.method) {
		case SEVI.AUTOSTOP.METHOD.ELECTRONS:
			if (ImageManager.autostop.value.electrons === Infinity) ImageManager.autostop.use_autostop = false;
			else ImageManager.autostop.use_autostop = true;
			break;
		case SEVI.AUTOSTOP.METHOD.FRAMES:
			if (ImageManager.autostop.value.frames === Infinity) ImageManager.autostop.use_autostop = false;
			else ImageManager.autostop.use_autostop = true;
			break;
		default:
			ImageManager.autostop.use_autostop = false;
			break;
	}
	// Send current autostop information back
	ImageManager.autostop.send_info();
});
// Send autostop parameters
seviEmitter.on(SEVI.QUERY.AUTOSTOP.PARAMETERS, ImageManager.autostop.send_info);
// Send autostop progress
seviEmitter.on(SEVI.QUERY.AUTOSTOP.PROGRESS, ImageManager.autostop.send_progress);

/* Scan Status */

seviEmitter.on(SEVI.QUERY.SCAN.RUNNING, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.RUNNING, ImageManager.status.running);
});
seviEmitter.on(SEVI.QUERY.SCAN.PAUSED, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.PAUSED, ImageManager.status.paused);
});
seviEmitter.on(SEVI.QUERY.SCAN.ISIR, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.ISIR, ImageManager.status.isIR);
});

/* Scan Information */

seviEmitter.on(SEVI.QUERY.SCAN.CURRENTID, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.CURRENTID, ImageManager.current_image.id);
});
seviEmitter.on(SEVI.QUERY.SCAN.FILENAME, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.FILENAME, ImageManager.current_image.file_name);
});
seviEmitter.on(SEVI.QUERY.SCAN.FILENAMEIR, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.FILENAMEIR, ImageManager.current_image.file_name_ir);
});
seviEmitter.on(SEVI.QUERY.COUNTS.TOTAL, () => {
	// If there is a (non-empty) image in current_image, send that count info
	// otherwise send the count info from last_image
	if (ImageManager.current_image.is_empty) {
		seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.last_image.counts);
	} else {
		seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.current_image.counts);
	}
});

/* Images (for displaying) */
seviEmitter.on(SEVI.QUERY.IMAGE.IROFF, () => {
	ImageManager.get_image_display("IROFF");
});
seviEmitter.on(SEVI.QUERY.IMAGE.IRON, () => {
	ImageManager.get_image_display("IRON");
});
seviEmitter.on(SEVI.QUERY.IMAGE.DIFFPOS, () => {
	ImageManager.get_image_display("DIFFPOS");
});
seviEmitter.on(SEVI.QUERY.IMAGE.DIFFNEG, () => {
	ImageManager.get_image_display("DIFFNEG");
});

/****
		Functions
****/

function ImageManager_startup() {
	ImageManager.autostop.both = settings?.autostop?.both_images || false;
}

function ImageManager_start_scan(is_ir) {
	if (ImageManager.status.running) {
		// Image is already running, do nothing
		return;
	}
	let new_image, update_message;
	if (is_ir) {
		new_image = new IRImage();
		ImageManager.status.isIR = true;
		update_message = "New IR SEVI Scan Started!";
	} else {
		new_image = new Image();
		ImageManager.status.isIR = false;
		update_message = "New SEVI Scan Started!";
	}
	ImageManager.all_images.push(new_image);
	ImageManager.current_image = new_image;
	// Update current image info with that from last image
	ImageManager.current_image.update_information(ImageManager.last_image);
	// Delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.status.running = true;
	// Alert that a new image has been started
	seviEmitter.emit(SEVI.ALERT.SCAN.STARTED);
	msgEmitter.emit(MSG.UPDATE, update_message);
	// Get info about image
	ImageManager.get_image_info();
	// Uptick image series progression
	ImageManager.series.progress++;
	// Send image series update
	ImageManager.series.update();
	ImageManager.series.send_progress();
}

function ImageManager_stop_scan() {
	if (!ImageManager.status.running) {
		// An image is not running, do nothing
		return;
	}
	// Stop scan
	ImageManager.status.running = false;
	ImageManager.status.paused = false;
	// Save image to file
	ImageManager.current_image.save_image();
	// Move current image to last image, and empty current image
	// But first, delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	// Alert that the scan has been stopped
	seviEmitter.emit(SEVI.ALERT.SCAN.STOPPED);
	if (ImageManager.status.isIR) msgEmitter.emit(MSG.UPDATE, "IR-SEVI Scan Stopped!");
	else msgEmitter.emit(MSG.UPDATE, "SEVI Scan Stopped!");
	// Check if another image in series should be collected
	if (ImageManager.autostop.use_autostop) {
		// Check how many image in series have been collected
		if (ImageManager.series.progress < ImageManager.series.collection_length) {
			// Start another scan
			ImageManager.start_scan(ImageManager.status.isIR);
		} else {
			// Reset series progress
			ImageManager.series.progress = 0;
		}
	} else {
		// Reset series parameters
		ImageManager.series.update(1); // Set collection length to 1
		ImageManager.series.progress = 0;
	}
}

function ImageManager_pause_resume_scan() {
	// Options for what Pause/Resume button press should do:
	// 	1) Scan is running and unpaused -> scan should be paused
	//	2) Scan is running and paused -> scan should be unpaused
	// 	3) Scan was running but has been saved/canceled -> scan should be resumed
	//	4) No scan has been run yet -> do nothing
	if (ImageManager.status.running) {
		// An image is currently running, puts us in options 1) or 2)
		if (ImageManager.status.paused) {
			// Image is currently paused, should resume
			ImageManager.status.paused = false;
			seviEmitter.emit(SEVI.ALERT.SCAN.RESUMED);
		} else {
			// Image should be paused
			ImageManager.status.paused = true;
			seviEmitter.emit(SEVI.ALERT.SCAN.PAUSED);
		}
	} else {
		// No image is currently running, puts us in options 3) or 4)
		// Check if the last image is EmptyImage (meaning we're in option 4)
		if (ImageManager.last_image.is_empty) {
			return; // Do nothing
		} else {
			// Current image should be resumed
			ImageManager.current_image = ImageManager.last_image;
			ImageManager.last_image = EmptyImage;
			ImageManager.status.running = true;
			ImageManager.status.paused = false;
			seviEmitter.emit(SEVI.ALERT.SCAN.RESUMED);
		}
	}
}

// This is essentially the same as stop_scan, except the image isn't saved
function ImageManager_cancel_scan() {
	if (!ImageManager.status.running) {
		// An image is not running, do nothing
		return;
	}
	// Stop scan
	ImageManager.status.running = false;
	ImageManager.status.paused = false;
	// Move current image to last image, and empty current image
	// But first, delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	// Reset image series progress
	ImageManager.series.progress = 0;
	// Alert that the scan has been stopped
	seviEmitter.emit(SEVI.ALERT.SCAN.CANCELED);
	if (ImageManager.status.isIR) msgEmitter.emit(MSG.UPDATE, "IR-SEVI Scan Canceled!");
	else msgEmitter.emit(MSG.UPDATE, "SEVI Scan Canceled!");
}

function ImageManager_reset_scan() {
	ImageManager.current_image.reset_image();
	ImageManager.current_image.reset_counts();
	// Alert that the scan has been reset
	seviEmitter.emit(SEVI.ALERT.SCAN.RESET);
	if (ImageManager.status.isIR) msgEmitter.emit(MSG.UPDATE, "IR-SEVI Scan Reset!");
	else msgEmitter.emit(MSG.UPDATE, "SEVI Scan Reset!");
	// Also update electron counters
	seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.current_image.counts);
}

function ImageManager_get_image_info() {
	uiEmitter.emit(UI.QUERY.IMAGEID);
	uiEmitter.emit(UI.QUERY.VMI);
}

function ImageManager_get_image_display(which_image) {
	// First, get the display slider contrast from UI
	uiEmitter.once(UI.RESPONSE.DISPLAY.SLIDERVALUE, (slider_value) => {
		// If there is a (non-empty) image in current_image, send that image
		// otherwise send the image from last_image
		let image_obj;
		if (ImageManager.current_image.is_empty) image_obj = ImageManager.last_image;
		else image_obj = ImageManager.current_image;

		seviEmitter.emit(SEVI.RESPONSE.IMAGE, image_obj.get_image_display(which_image, slider_value));
	});
	uiEmitter.emit(UI.QUERY.DISPLAY.SLIDERVALUE);
}

// Update the image series collection length
function ImageManager_series_update(collection_length) {
	if (!ImageManager.autostop.use_autostop && collection_length > 1) {
		// Override collection length (can't take series of images if no autostop)
		collection_length = 1;
		msgEmitter.emit(MSG.ERROR, "Image Series Collection Requires 'Stop Scan After' Parameters To Be Set");
	}
	if (collection_length) ImageManager.series.collection_length = collection_length;
	seviEmitter.emit(SEVI.RESPONSE.SERIES.LENGTH, ImageManager.series.collection_length);
}

// Send info about how many images in series are left
function ImageManager_series_send_progress() {
	let remaining = ImageManager.series.collection_length - ImageManager.series.progress;
	if (!ImageManager.autostop.use_autostop) remaining = 0;
	if (remaining < 0) remaining = 0;
	seviEmitter.emit(SEVI.RESPONSE.SERIES.REMAINING, remaining);
}

function ImageManager_autostop_check() {
	// First and second check will be IR Off and On if image is IRSEVI image and both = true
	let first_value = 0;
	let second_value = 0;
	let first_match_value;
	let second_match_value;
	let counts = ImageManager.current_image.counts;
	let progress = 0;
	let to_stop = false;
	switch (ImageManager.autostop.method) {
		case SEVI.AUTOSTOP.METHOD.ELECTRONS:
			first_match_value = ImageManager.autostop.value.electrons * 1e5; // Convert to 1e5 electrons
			second_match_value = first_match_value;
			first_value = counts.electrons.off;
			second_value = counts.electrons.on;
			break;
		case SEVI.AUTOSTOP.METHOD.FRAMES:
			first_match_value = ImageManager.autostop.value.frames * 1e3; // Convert to 1k frames
			second_match_value = first_match_value;
			first_value = counts.frames.off;
			second_value = counts.frames.on;
			break;
		case SEVI.AUTOSTOP.METHOD.NONE:
			first_match_value = Infinity; // Make it impossible to match
			second_match_value = first_match_value;
			// Keep first_ and second_value at 0
			break;
	}
	// If the current image is SEVI, need to check image totals
	// If the current image is IR-SEVI, need to check each image individually
	if (ImageManager.current_image.is_ir) {
		if (!ImageManager.autostop.both) {
			// While image is IR-SEVI, user only wants to stop if one image meets autostop conditions
			first_value = Math.max(first_value, second_value);
			// Don't check second value (second_value = second_match_value is all that matters for next steps)
			second_value = 1e10;
			second_match_value = 1e10;
		}
		// User wants to check both images, no need to do anything
	} else {
		// Image is SEVI, need to check totals
		first_value += second_value;
		// Don't check second value (second_value = second_match_value is all that matters for next steps)
		second_value = 1e10;
		second_match_value = 1e10;
	}
	// Update progress to whatever image is further away from completion
	progress = 100 * Math.min(first_value / first_match_value, second_value / second_match_value);
	// Check if conditions were met
	if (first_value >= first_match_value && second_value >= second_match_value) {
		progress = 100;
		// Stop image
		to_stop = true;
		ImageManager.stop_scan();
	}
	// Update ImageManager
	ImageManager.autostop.progress = progress;
	// Send progress update
	ImageManager.autostop.send_progress();
	return { progress: progress, to_stop: to_stop };
}

function ImageManager_autostop_send_info() {
	let autostop_params = {
		method: ImageManager.autostop.method,
		value: Infinity,
	};
	if (ImageManager.autostop.method === SEVI.AUTOSTOP.METHOD.ELECTRONS) {
		autostop_params.value = ImageManager.autostop.value.electrons;
	} else if (ImageManager.autostop.method === SEVI.AUTOSTOP.METHOD.FRAMES) {
		autostop_params.value = ImageManager.autostop.value.frames;
	}
	seviEmitter.emit(SEVI.RESPONSE.AUTOSTOP.PARAMETERS, autostop_params);
}

function test_auto_stop() {
	console.log("IRSEVI test, both = true");
	ImageManager.autostop.both = true;
	console.log("	First test, value == Infinity, counts = 0");
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());

	console.log("	Second test, value == 1, counts = 0");
	ImageManager.autostop.value.electrons = 1;
	ImageManager.autostop.value.frames = 1;
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());

	console.log("	Third test, value == 1, counts = 0.5 and 0");
	ImageManager.current_image.counts.electrons.off = 0.5 * 1e5;
	ImageManager.current_image.counts.frames.off = 0.5 * 1e3;
	ImageManager.current_image.counts.electrons.on = 0 * 1e5;
	ImageManager.current_image.counts.frames.on = 0 * 1e3;
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());

	console.log("	Fourth test, value == 1, counts = 0.5 and 0.7");
	ImageManager.current_image.counts.electrons.off = 0.5 * 1e5;
	ImageManager.current_image.counts.frames.off = 0.5 * 1e3;
	ImageManager.current_image.counts.electrons.on = 0.7 * 1e5;
	ImageManager.current_image.counts.frames.on = 0.7 * 1e3;
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());

	console.log("	Fifth test, value == 1, counts = 1.5 and 0.7");
	ImageManager.current_image.counts.electrons.off = 1.5 * 1e5;
	ImageManager.current_image.counts.frames.off = 1.5 * 1e3;
	ImageManager.current_image.counts.electrons.on = 0.7 * 1e5;
	ImageManager.current_image.counts.frames.on = 0.7 * 1e3;
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());

	console.log("	Sixth test, value == 1, counts = 1.5 and 1.7");
	ImageManager.current_image.counts.electrons.off = 1.5 * 1e5;
	ImageManager.current_image.counts.frames.off = 1.5 * 1e3;
	ImageManager.current_image.counts.electrons.on = 1.7 * 1e5;
	ImageManager.current_image.counts.frames.on = 1.7 * 1e3;
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.NONE;
	console.log("NONE", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.ELECTRONS;
	console.log("ELECTRONS", ImageManager.autostop.check());
	ImageManager.autostop.method = SEVI.AUTOSTOP.METHOD.FRAMES;
	console.log("FRAMES", ImageManager.autostop.check());
}

/*****************************************************************************

							AVERAGE ELECTRON MANAGER 

*****************************************************************************/

async function test_memory(delete_img, num_images = 10) {
	if (delete_img) delete_image = true;

	let starting_memory = process.memoryUsage().heapUsed;

	for (let i = 0; i < num_images; i++) {
		seviEmitter.emit(SEVI.SCAN.STARTIR);
		await sleep(5000);
		seviEmitter.emit(SEVI.SCAN.STOP);
		await sleep(1000);
	}

	let final_memory = process.memoryUsage().heapUsed;
	return final_memory - starting_memory;
}

async function test_memory_2() {
	let starting_memory, final_memory;
	let withdel, withoutdel;
	// Run 5 SEVI images
	starting_memory = process.memoryUsage().heapUsed;
	for (let i = 0; i < 5; i++) {
		seviEmitter.emit(SEVI.SCAN.START);
		await sleep(5000);
		seviEmitter.emit(SEVI.SCAN.STOP);
		await sleep(1000);
	}
	final_memory = process.memoryUsage().heapUsed;
	console.log("5 SEVI images:", final_memory - starting_memory);
	// Run 20 IR images w/out deleting
	starting_memory = process.memoryUsage().heapUsed;
	for (let i = 0; i < 20; i++) {
		seviEmitter.emit(SEVI.SCAN.STARTIR);
		await sleep(5000);
		seviEmitter.emit(SEVI.SCAN.STOP);
		await sleep(1000);
	}
	final_memory = process.memoryUsage().heapUsed;
	withdel = final_memory - starting_memory;
	console.log("20 w/out deleting:", withdel);
	// Run 20 IR images w/out deleting
	delete_image = true;
	starting_memory = process.memoryUsage().heapUsed;
	for (let i = 0; i < 20; i++) {
		seviEmitter.emit(SEVI.SCAN.STARTIR);
		await sleep(5000);
		seviEmitter.emit(SEVI.SCAN.STOP);
		await sleep(1000);
	}
	final_memory = process.memoryUsage().heapUsed;
	withoutdel = final_memory - starting_memory;
	console.log("20 w/ deleting:", withoutdel);
	return withdel / withoutdel;
}
