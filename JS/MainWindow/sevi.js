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

uiEmitter.on(UI.INFO.RESPONSE.IMAGEID, (image_id) => {
	ImageManager.current_image.id = image_id;
	// Make sure file names also get updated
	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);
	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAMEIR);
});
uiEmitter.on(UI.INFO.RESPONSE.VMIINFO, (vmi_info) => {
	ImageManager.current_image.vmi_info = vmi_info;
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
	let new_image;
	if (is_ir) {
		new_image = new IRImage();
		ImageManager.status.isIR = true;
	} else {
		new_image = new Image();
		ImageManager.status.isIR = false;
	}
	ImageManager.all_images.push(new_image);
	ImageManager.current_image = new_image;
	ImageManager.status.running = true;
	// Alert that a new image has been started
	seviEmitter.emit(SEVI.ALERT.SCAN.STARTED);
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
	// Move current image to last image, and empty current image
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	// Save image to file
	ImageManager.last_image.save_image();
	// Alert that the scan has been stopped
	seviEmitter.emit(SEVI.ALERT.SCAN.STOPPED);
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
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	// Alert that the scan has been stopped
	seviEmitter.emit(SEVI.ALERT.SCAN.CANCELED);
}

function ImageManager_get_image_info() {
	uiEmitter.emit(UI.INFO.QUERY.IMAGEID);
	uiEmitter.emit(UI.INFO.QUERY.VMIINFO);
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
	uiEmitter.once(UI.INFO.RESPONSE.DISPLAYSLIDERVALUE, (slider_value) => {
		// If there is a (non-empty) image in current_image, send that image
		// otherwise send the image from last_image
		let image_obj;
		if (ImageManager.current_image.is_empty) image_obj = ImageManager.last_image;
		else image_obj = ImageManager.current_image;

		seviEmitter.emit(SEVI.RESPONSE.IMAGE, image_obj.get_image_display(which_image, slider_value));
	});
	uiEmitter.emit(UI.INFO.QUERY.DISPLAYSLIDERVALUE);
}

/*****************************************************************************

							AVERAGE ELECTRON MANAGER 

*****************************************************************************/
