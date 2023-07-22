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
	// NOTE TO MARTY: Add image update here
	seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.current_image.counts);
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
uiEmitter.on(UI.RESPONSE.VMIINFO, (vmi_info) => {
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
	// Update current image laser info with that from last image
	ImageManager.current_image.detachment_wavelength = ImageManager.last_image.detachment_wavelength;
	ImageManager.current_image.detachment_measurement = ImageManager.last_image.detachment_measurement;
	ImageManager.current_image.excitation_wavelength = ImageManager.last_image.excitation_wavelength;
	ImageManager.current_image.excitation_measurement = ImageManager.last_image.excitation_measurement;
	// Delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.status.running = true;
	// Alert that a new image has been started
	seviEmitter.emit(SEVI.ALERT.SCAN.STARTED);
	msgEmitter.emit(MSG.UPDATE, update_message);
	// Get info about image
	ImageManager.get_image_info();
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
	msgEmitter.emit(MSG.UPDATE, "(IR) SEVI Scan Stopped!");
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
	// Alert that the scan has been stopped
	seviEmitter.emit(SEVI.ALERT.SCAN.CANCELED);
	msgEmitter.emit(MSG.UPDATE, "(IR) SEVI Scan Canceled!");
}

function ImageManager_reset_scan() {
	ImageManager.current_image.reset_image();
	ImageManager.current_image.reset_counts();
	// Alert that the scan has been reset
	seviEmitter.emit(SEVI.ALERT.SCAN.RESET);
	msgEmitter.emit(MSG.UPDATE, "(IR) SEVI Scan Reset!");
	// Also update electron counters
	seviEmitter.emit(SEVI.RESPONSE.COUNTS.TOTAL, ImageManager.current_image.counts);
}

function ImageManager_get_image_info() {
	uiEmitter.emit(UI.QUERY.IMAGEID);
	uiEmitter.emit(UI.QUERY.VMIINFO);
}

function ImageManager_get_image_display(which_image) {
	// Only update the accumulated image display 4x a second -> once every 5 camera frames
	// Unless the current image's frame count is a multiple of 5 + 1, return undefined
	// (subtract 1 so that total frames == 0 doesn't trigger display update)
	/*if ((ImageManager.current_image.counts.frames.total - 1) % 5) {
		seviEmitter.emit(SEVI.RESPONSE.IMAGE);
		return;
	}*/
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
