/************************************************** 

			Control for SEVI / IR-SEVI

**************************************************/

/*****************************************************************************

							VMI IMAGE CLASSES

*****************************************************************************/

// Class for SEVI images
class Image {
	constructor() {
		this.id = 1;
		this.is_ir = false;

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

	get id_str() {
		if (this.id < 10) return `0${this.id}`;
		else return this.id.toString();
	}

	/* Current date, formatted as MMDDYY */
	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	get file_name() {
		return `${this.formatted_date}i${this.id_str}.i0N`;
	}

	get file_name_ir() {
		return `${this.formatted_date}i${this.id_str}_IR.i0N`;
	}

	save_image() {
		console.log("Image has been saved! (Not really)");
	}
}

// Not sure if this class is necessary...
class IRImage extends Image {
	constructor() {
		super();
		this.is_ir = true;
	}
}

// This image is a place holder for ImageManager.current_image whenever a scan is not currently being taken
// That way the image functionality (such as returning file names) can still be used
const EmptyImage = new IRImage();

/*****************************************************************************

								Image Manager

*****************************************************************************/

// This is what manages all the VMI images, taking in requests from UI, Camera, etc

const ImageManager = {
	status: {
		running: false,
		paused: false,
		isIR: false,
	},
	all_images: [],
	current_image: EmptyImage,
	start_scan: (is_ir) => ImageManager_start_scan(is_ir),
};

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
seviEmitter.on(SEVI.SCAN.START, () => {
	ImageManager.start_scan(false);
});
seviEmitter.on(SEVI.SCAN.STARTIR, () => {
	ImageManager.start_scan(true);
});

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
seviEmitter.on(SEVI.QUERY.SCAN.FILENAME, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.FILENAME, ImageManager.current_image.file_name);
});
seviEmitter.on(SEVI.QUERY.SCAN.FILENAMEIR, () => {
	seviEmitter.emit(SEVI.RESPONSE.SCAN.FILENAMEIR, ImageManager.current_image.file_name_ir);
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
	ImageManager.current_image = EmptyImage;
}

function ImageManager_get_image_info() {
	uiEmitter.emit(UI.INFO.QUERY.IMAGEID);
	uiEmitter.emit(UI.INFO.QUERY.VMIINFO);
}
