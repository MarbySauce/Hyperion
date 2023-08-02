/************************************************** 

	Control for Accumulated Image Collection

**************************************************/

const ipc = require("electron").ipcRenderer;
const { Image, IRImage, EmptyIRImage, ImageType } = require("./ImageClasses.js");
const { ManagerAlert } = require("./ManagerAlert.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

// This image is a place holder for ImageManager.current_image whenever a scan is not currently being taken
// That way the image functionality (such as returning file names) can still be used
const EmptyImage = new EmptyIRImage();

/**
 * Autostop Method Enums
 */
class AutostopMethod {
	static ELECTRONS = new AutostopMethod(1e5);
	static FRAMES = new AutostopMethod(1e3);
	static NONE = new AutostopMethod(Infinity);

	constructor(multiplier) {
		this.multiplier = multiplier;
	}
}

/**
 * ImageManager Status Enums
 */
class IMState {
	/** Image is being collected */
	static RUNNING = new IMState();
	/** Image collection is paused */
	static PAUSED = new IMState();
	/** No image is being collected */
	static STOPPED = new IMState();
}

/*****************************************************************************

								IMAGE MANAGER

*****************************************************************************/

// This is what manages all the VMI images, taking in requests from UI, Camera, etc

const ImageManager = {
	status: IMState.STOPPED,
	params: {
		image_contrast: 0.5,
		centroid: {
			use_hybrid_method: true,
			bin_size: 100,
		},
	},
	info: {
		vmi: {},
		base_dir: "",
	},
	autostop: {
		method: AutostopMethod.NONE,
		value: {
			electrons: Infinity,
			frames: Infinity,
		},
		use_autostop: false,
		both: false, // Whether both images (in IR-SEVI scan) need to meet autostop condition or just one
		progress: 0, // Percent completion, as value between 0 and 100
		check: () => ImageManager_autostop_check(),
		update_info: (autostop_params) => ImageManager_autostop_update_info(autostop_params),
		send_info: () => ImageManager_autostop_send_info(),
	},
	series: {
		collection_length: 1,
		progress: 0, // # of images in series taken
		update: (collection_length) => ImageManager_series_update(collection_length),
		check: () => ImageManager_series_check(),
		send_progress: () => ImageManager_series_send_progress(),
	},
	all_images: [],
	current_image: EmptyImage, // Image that is currently being taken
	last_image: EmptyImage, // Last image that was taken
	start_scan: (is_ir) => ImageManager_start_scan(is_ir),
	stop_scan: () => ImageManager_stop_scan(),
	pause_scan: () => ImageManager_pause_scan(),
	resume_scan: (resume_last) => ImageManager_resume_scan(resume_last),
	cancel_scan: () => ImageManager_cancel_scan(),
	reset_scan: () => ImageManager_reset_scan(),
	get_image_display: (which_image) => ImageManager_get_image_display(which_image),

	increase_id: () => ImageManager_increase_id(),
	decrease_id: () => ImageManager_decrease_id(),
	set_id: (id) => ImageManager_set_id(id),

	update_vmi: (vmi_info) => ImageManager_update_vmi(vmi_info),

	process_settings: (settings) => ImageManager_process_settings(settings),
};

/****
		IPC Event Listener
****/

// Listen for new camera frame event
ipc.on(IPCMessages.UPDATE.NEWFRAME, (event, centroid_results) => {
	if (ImageManager.status !== IMState.RUNNING) {
		return; // Don't update if an image is not running or is paused
	}
	ImageManager.current_image.update_counts(centroid_results);
	ImageManager.current_image.update_image(centroid_results);
	// Send updates about electron count information
	IMAlerts.info_update.image.counts.alert(ImageManager.current_image.counts);
	// Check if autostop condition has been met
	ImageManager.autostop.check();
});

/****
		Functions
****/

/* Automatic image stop */

function ImageManager_autostop_check() {
	// First and second check will be IR Off and On if image is IRSEVI image and both = true
	let first_value = 0;
	let second_value = 0;
	let first_match_value, second_match_value;
	let counts = ImageManager.current_image.counts;
	let progress = 0;
	let to_stop = false;
	switch (ImageManager.autostop.method) {
		case AutostopMethod.ELECTRONS:
			first_match_value = ImageManager.autostop.value.electrons * AutostopMethod.ELECTRONS.multiplier; // Convert to 1e5 electrons
			second_match_value = first_match_value;
			first_value = counts.electrons.off;
			second_value = counts.electrons.on;
			break;
		case AutostopMethod.FRAMES:
			first_match_value = ImageManager.autostop.value.frames * AutostopMethod.FRAMES.multiplier; // Convert to 1k frames
			second_match_value = first_match_value;
			first_value = counts.frames.off;
			second_value = counts.frames.on;
			break;
		case AutostopMethod.NONE:
			first_match_value = Infinity; // Make it impossible to match
			second_match_value = first_match_value;
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
	IMAlerts.info_update.autostop.progress.alert(progress);
	return { progress: progress, to_stop: to_stop };
}

function ImageManager_autostop_update_info(autostop_params) {
	// autostop_params will look like {method: (AutostopMethod), value: (number)}
	// If only updating the method, autostop_params.value should be undefined
	// If only updating the value, autostop_params.method should be undefined
	// If updating both, neither .value or .method should be undefined
	if (autostop_params.method && autostop_params.value) {
		// Update both
		ImageManager.autostop.method = autostop_params.method;
		if (autostop_params.method === AutostopMethod.ELECTRONS) {
			ImageManager.autostop.value.electrons = autostop_params.value;
		} else if (autostop_params.method === AutostopMethod.FRAMES) {
			ImageManager.autostop.value.frames = autostop_params.value;
		}
	} else if (autostop_params.method) {
		// Only update method
		ImageManager.autostop.method = autostop_params.method;
	} else if (autostop_params.value) {
		// Only update value
		if (ImageManager.autostop.method === AutostopMethod.ELECTRONS) {
			ImageManager.autostop.value.electrons = autostop_params.value;
		} else if (ImageManager.autostop.method === AutostopMethod.FRAMES) {
			ImageManager.autostop.value.frames = autostop_params.value;
		}
	}
	// Update status of whether autostop is being used (method != none and value != infinity)
	switch (ImageManager.autostop.method) {
		case AutostopMethod.ELECTRONS:
			if (ImageManager.autostop.value.electrons === Infinity) ImageManager.autostop.use_autostop = false;
			else ImageManager.autostop.use_autostop = true;
			break;
		case AutostopMethod.FRAMES:
			if (ImageManager.autostop.value.frames === Infinity) ImageManager.autostop.use_autostop = false;
			else ImageManager.autostop.use_autostop = true;
			break;
		default:
			ImageManager.autostop.use_autostop = false;
			break;
	}
	// Send current autostop information back
	ImageManager.autostop.send_info();
}

function ImageManager_autostop_send_info() {
	let autostop_params = {
		method: ImageManager.autostop.method,
		value: Infinity,
	};
	if (ImageManager.autostop.method === AutostopMethod.ELECTRONS) {
		autostop_params.value = ImageManager.autostop.value.electrons;
	} else if (ImageManager.autostop.method === AutostopMethod.FRAMES) {
		autostop_params.value = ImageManager.autostop.value.frames;
	}
	IMAlerts.info_update.autostop.params.alert(autostop_params);
}

/* Image series collection */

// Update the image series collection length
function ImageManager_series_update(collection_length) {
	if (!ImageManager.autostop.use_autostop && collection_length > 1) {
		// Override collection length (can't take series of images if no autostop)
		collection_length = 1;
		update_messenger.error("Image Series Collection Requires 'Stop Scan After' Parameters To Be Set");
	}
	if (collection_length) ImageManager.series.collection_length = collection_length;
	IMAlerts.info_update.image_series.params.alert(ImageManager.series.collection_length);
}

function ImageManager_series_check() {
	if (ImageManager.autostop.use_autostop) {
		// Check how many image in series have been collected
		if (ImageManager.series.progress < ImageManager.series.collection_length) {
			// Start another scan
			ImageManager.start_scan(ImageManager.last_image.is_ir);
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

// Send info about how many images in series are left
function ImageManager_series_send_progress() {
	let remaining = ImageManager.series.collection_length - ImageManager.series.progress;
	if (!ImageManager.autostop.use_autostop) remaining = 0;
	if (remaining < 0) remaining = 0;
	IMAlerts.info_update.image_series.remaining.alert(remaining);
}

/* Scan control */

function ImageManager_start_scan(is_ir) {
	if (ImageManager.status === IMState.RUNNING) {
		// Image is already running, do nothing
		return;
	}
	let new_image;
	if (is_ir) {
		new_image = new IRImage();
		update_messenger.update("New IR-SEVI Scan Started!");
	} else {
		new_image = new Image();
		update_messenger.update("New SEVI Scan Started!");
	}
	// Update current image info with that from last image
	new_image.update_information(ImageManager.last_image);
	// Empty image in current_image will have correct id
	new_image.id = ImageManager.current_image.id;
	ImageManager.all_images.push(new_image);
	ImageManager.current_image = new_image;
	// Delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.status = IMState.RUNNING;
	// Alert that a new image has been started
	IMAlerts.event.scan.start.alert();
	IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
	IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
	IMAlerts.info_update.image.file_name_ir.alert(ImageManager.current_image.file_name_ir);
	// Uptick image series progression
	ImageManager.series.progress++;
	// Send image series update
	ImageManager.series.update();
	ImageManager.series.send_progress();
}

function ImageManager_stop_scan() {
	if (ImageManager.status === IMState.STOPPED) {
		// Image is already stopped, do nothing
		return;
	}
	// Stop scan
	ImageManager.status = IMState.STOPPED;
	// Save image to file
	ImageManager.current_image.save_image();
	// Move current image to last image, and empty current image
	// But first, delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	ImageManager.current_image.id = ImageManager.last_image.id + 1; // Uptick ID by 1
	// Alert that the scan has been stopped
	IMAlerts.event.scan.stop.alert();
	IMAlerts.event.scan.stop_or_cancel.alert();
	IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
	IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
	IMAlerts.info_update.image.file_name_ir.alert(ImageManager.current_image.file_name_ir);
	// Check if another image in series should be collected
	ImageManager.series.check();
}

function ImageManager_pause_scan() {
	if (ImageManager.status !== IMState.RUNNING) {
		// An image is not running, do nothing
		return;
	}
	ImageManager.status = IMState.PAUSED;
	IMAlerts.event.scan.pause.alert();
	update_messenger.update("(IR) SEVI Scan Paused!");
}

function ImageManager_resume_scan(resume_last) {
	// Three options we care about here:
	// 1) Scan is paused -> scan should be resumed
	// 2) Scan is stopped and last image is empty -> do nothing
	// 3) Scan is stopped and last image is not empty -> resume that image
	switch (ImageManager.status) {
		case IMState.PAUSED: // (1)
			ImageManager.status = IMState.RUNNING;
			IMAlerts.event.scan.resume.alert();
			update_messenger.update("(IR) SEVI Scan Resumed!");
			break;
		case IMState.STOPPED: // (2) or (3)
			if (ImageManager.last_image.is_empty) break; // (3) Do nothing
			// else (2)
			if (resume_last) {
				ImageManager.current_image = ImageManager.last_image;
				ImageManager.last_image = EmptyImage;
				ImageManager.status = IMState.RUNNING;
				IMAlerts.event.scan.resume.alert();
				IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
				IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
				update_messenger.update("(IR) SEVI Scan Resumed!");
			}
			break;
	}
}

// This is essentially the same as stop_scan, except the image isn't saved
function ImageManager_cancel_scan() {
	if (ImageManager.status === IMState.STOPPED) {
		// An image is not running, do nothing
		return;
	}
	// Stop scan
	ImageManager.status = IMState.STOPPED;
	// Move current image to last image, and empty current image
	// But first, delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.last_image = ImageManager.current_image;
	ImageManager.current_image = EmptyImage;
	// Alert that image was canceled
	IMAlerts.event.scan.cancel.alert();
	IMAlerts.event.scan.stop_or_cancel.alert();
	update_messenger.update("(IR) SEVI Scan Canceled!");
}

function ImageManager_reset_scan() {
	ImageManager.current_image.reset_image();
	ImageManager.current_image.reset_counts();
	// Alert that the scan has been reset
	IMAlerts.event.scan.reset.alert();
	// Also update electron counters
	IMAlerts.info_update.image.counts.alert(ImageManager.current_image.counts);
	update_messenger.update("(IR) SEVI Scan Reset!");
}

function ImageManager_increase_id() {
	ImageManager.current_image.id++;
	IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
	IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
	IMAlerts.info_update.image.file_name_ir.alert(ImageManager.current_image.file_name_ir);
}

function ImageManager_decrease_id() {
	ImageManager.current_image.id--;
	if (ImageManager.current_image.id < 1) ImageManager.current_image.id = 1;
	IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
	IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
	IMAlerts.info_update.image.file_name_ir.alert(ImageManager.current_image.file_name_ir);
}

function ImageManager_set_id(id) {
	// Make sure ID is a strictly positive integer
	if (!Number.isInteger(id) || id < 1) return;
	ImageManager.current_image.id = id;
	IMAlerts.info_update.image.id.alert(ImageManager.current_image.id);
	IMAlerts.info_update.image.file_name.alert(ImageManager.current_image.file_name);
	IMAlerts.info_update.image.file_name_ir.alert(ImageManager.current_image.file_name_ir);
}

function ImageManager_update_vmi(vmi_info) {
	let mode, index, constants;
	if (vmi_info.index !== undefined) {
		index = vmi_info.index;
		mode = `V${vmi_info.index + 1}`;
		constants = ImageManager.info.vmi[mode];
		if (!constants) return;
	} else if (vmi_info.mode !== undefined) {
		index = parseInt(vmi_info.mode.charAt(1)) - 1;
		mode = vmi_info.mode;
		constants = ImageManager.info.vmi[mode];
		if (!constants) return;
	} else {
		return;
	}
	let info = {
		index: index,
		mode: mode,
		calibration_constants: constants,
	};
	ImageManager.current_image.vmi_info = info;
	IMAlerts.info_update.image.vmi_info.alert(info);
}

function ImageManager_get_image_display(which_image) {
	let image_obj;
	if (ImageManager.current_image.is_empty) image_obj = ImageManager.last_image;
	else image_obj = ImageManager.current_image;
	let contrast = ImageManager.params.image_contrast;
	return image_obj.get_image_display(which_image, contrast);
}

function ImageManager_process_settings(settings) {
	if (!settings) return; // settings is blank
	ImageManager.params.centroid.use_hybrid_method = settings.centroid.hybrid_method;
	ImageManager.params.centroid.bin_size = settings.centroid.bin_size;
	Image.bin_size = settings.centroid.bin_size;

	ImageManager.info.base_dir = settings.save_directory.base_dir;

	ImageManager.info.vmi = settings.vmi;

	ImageManager.autostop.both = settings.autostop.both_images;
}

/*****************************************************************************

							IMAGE MANAGER ALERTS

*****************************************************************************/

const IMAlerts = {
	event: {
		scan: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
			pause: new ManagerAlert(),
			resume: new ManagerAlert(),
			cancel: new ManagerAlert(),
			reset: new ManagerAlert(),
			stop_or_cancel: new ManagerAlert(),
		},
	},
	info_update: {
		image: {
			id: new ManagerAlert(),
			file_name: new ManagerAlert(),
			file_name_ir: new ManagerAlert(),
			counts: new ManagerAlert(),
			vmi_info: new ManagerAlert(),
		},
		contrast: new ManagerAlert(),
		autostop: {
			params: new ManagerAlert(),
			progress: new ManagerAlert(),
		},
		image_series: {
			params: new ManagerAlert(),
			remaining: new ManagerAlert(),
		},
		avg_electrons: new ManagerAlert(),
	},
};

/*****************************************************************************

					IMAGE MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from Image Manager */
class IMMessengerInformation {
	constructor() {
		this._status = {
			/** Whether an image is being collected */
			get running() {
				return ImageManager.status === IMState.RUNNING;
			},
			/** Whether an image is paused */
			get paused() {
				return ImageManager.status === IMState.PAUSED;
			},
			/** Whether an image is not being collected */
			get stopped() {
				return ImageManager.status === IMState.STOPPED;
			},
		};

		this._image_info = {
			/** Current image ID */
			get id() {
				return ImageManager.current_image.id;
			},
			/** Current image ID as ≥2 digit string */
			get id_str() {
				return ImageManager.current_image.id_str;
			},
			/** Current image file name */
			get file_name() {
				return ImageManager.current_image.file_name;
			},
			/** Current image IR file name */
			get file_name_ir() {
				return ImageManager.current_image.file_name_ir;
			},
			/** Whether current image is an IR image */
			get is_ir() {
				return ImageManager.current_image.is_ir;
			},
			/** Current image electron and frame counts */
			get counts() {
				return ImageManager.current_image.counts;
			},
			/** Current image VMI information */
			get vmi_info() {
				return ImageManager.current_image.vmi_info;
			},
		};

		this._autostop = {
			/** Get image automatic stop parameters
			 * @returns `{ method: {AutostopMethod}, value: {number} }`
			 */
			get params() {
				let autostop_params = {
					method: ImageManager.autostop.method,
					value: Infinity,
				};
				if (ImageManager.autostop.method === AutostopMethod.ELECTRONS) {
					autostop_params.value = ImageManager.autostop.value.electrons;
				} else if (ImageManager.autostop.method === AutostopMethod.FRAMES) {
					autostop_params.value = ImageManager.autostop.value.frames;
				}
				return autostop_params;
			},
			/** Get image automatic stop progress as number between 0 - 100 */
			get progress() {
				return ImageManager.autostop.progress;
			},
			/** Whether the autostop functionality is currently in use */
			get in_use() {
				return ImageManager.autostop.use_autostop;
			},
		};
	}

	/** Status of Image Manager */
	get status() {
		return this._status;
	}

	/** Information about the current image */
	get image_info() {
		return this._image_info;
	}

	get image_contrast() {
		return ImageManager.params.image_contrast;
	}

	get autostop() {
		return this._autostop;
	}

	/**
	 * Get the accumulated image (for displaying on canvas elements)
	 * @param {ImageType} which_image Which accumulated image to return
	 * @returns {ImageData} accumulated image
	 */
	get_image_display(which_image) {
		return ImageManager.get_image_display(which_image);
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request Image Manager take action */
class IMMessengerRequest {
	constructor() {
		this._scan = {
			/**
			 * Start collecting accumulated image (SEVI mode)
			 * @param {Boolean} return_promise whether to return promise (useful if waiting for scan to finish)
			 * @returns {void | Promise} resolves when image is stopped, rejects when image is canceled
			 */
			start: (return_promise) => {
				ImageManager.start_scan(false);
				if (return_promise) {
					let promise = new Promise((resolve, reject) => {
						IMAlerts.event.scan.stop.add_once(resolve);
						IMAlerts.event.scan.cancel.add_once(reject);
					});
					return promise;
				}
			},
			/**
			 * Start collecting accumulated IR image (IR-SEVI mode)
			 * @param {Boolean} return_promise whether to return promise (useful if waiting for scan to finish)
			 * @returns {void | Promise} resolves when image is stopped, rejects when image is canceled
			 */
			start_ir: (return_promise) => {
				ImageManager.start_scan(true);
				if (return_promise) {
					let promise = new Promise((resolve, reject) => {
						IMAlerts.event.scan.stop.add_once(resolve);
						IMAlerts.event.scan.cancel.add_once(reject);
					});
					return promise;
				}
			},
			/** Pause collecting accumulated image */
			pause: () => {
				ImageManager.pause_scan();
			},
			/**
			 * Resume collecting accumulated image
			 * @param {Boolean} resume_last - Whether to resume previously stopped image
			 */
			resume: (resume_last) => {
				ImageManager.resume_scan(resume_last);
			},
			/** Stop collecting accumulated image and save */
			stop: () => {
				ImageManager.stop_scan();
			},
			/** Cancel accumulated image collection (stop without saving) */
			cancel: () => {
				ImageManager.cancel_scan();
			},
			/** Reset accumulated image and counts */
			reset: () => {
				ImageManager.reset_scan();
			},
		};
	}

	/** Take action related to accumulated image collection */
	get scan() {
		return this._scan;
	}

	//single_shot() {
	//	ImageManager.single_shot();
	//}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request Image Manager information be updated or changed */
class IMMessengerUpdate {
	constructor() {
		this._id = {
			/** Increase image ID by 1 */
			increase: () => {
				ImageManager.increase_id();
			},
			/** Decrese image ID by 1 (unless it's alreay 1) */
			decrease: () => {
				ImageManager.decrease_id();
			},
			/**
			 * Set current image id to `id`
			 * @param {Number} id must be integer > 0
			 */
			set: (id) => {
				ImageManager.set_id(id);
			},
		};
	}

	/** Update information related to image ID */
	get id() {
		return this._id;
	}

	/**
	 * Update Image Manager parameters based on settings
	 * @param {Object} settings
	 */
	process_settings(settings) {
		ImageManager.process_settings(settings);
	}

	/**
	 * Update current image VMI setting
	 * @param {Object} vmi_info Needs to contain either property `index` {Number} 0-3 selected VMI index
	 *  or `mode` {String} either "V1", "V2", "V3", or "V4"
	 */
	vmi_info(vmi_info) {
		ImageManager.update_vmi(vmi_info);
	}

	/**
	 * Update displayed accumulated image contrast
	 * @param {Number} value Between 0 and 1
	 */
	image_contrast(value) {
		if (0 <= value && value <= 1) {
			ImageManager.params.image_contrast = value;
			IMAlerts.info_update.contrast.alert(value);
		}
	}

	/**
	 * Update autostop parameters
	 * @param {Object} autostop_params { method: {AutostopMethod}, value: {number} } - at least 1 property has to be defined
	 */
	autostop(autostop_params) {
		ImageManager.autostop.update_info(autostop_params);
	}

	/**
	 * Take a series of SEVI or IR-SEVI images in a row
	 * @param {Number} length Number of images to take in a row (default is 1)
	 */
	image_series(length) {
		ImageManager.series.update(length);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class IMMessengerCallback {
	constructor() {
		this._event = new IMMessengerCallbackEvent();
		this._info_update = new IMMessengerCallbackInfoUpdate();
	}

	get event() {
		return this._event;
	}
	get info_update() {
		return this._info_update;
	}
}

/***************************************** 
	Listen for action being executed
*****************************************/

/** Set up callback functions to be executed when event occurs */
class IMMessengerCallbackEvent {
	constructor() {
		this._scan = {
			_start: {
				/**
				 * Execute callback function *every time* an accumulated image is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* an accumulated image is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.stop.add_once(callback);
				},
			},
			_pause: {
				/**
				 * Execute callback function *every time* an accumulated image is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.pause.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.pause.add_once(callback);
				},
			},
			_resume: {
				/**
				 * Execute callback function *every time* an accumulated image is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.resume.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.resume.add_once(callback);
				},
			},
			_cancel: {
				/**
				 * Execute callback function *every time* an accumulated image is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.cancel.add_once(callback);
				},
			},
			_reset: {
				/**
				 * Execute callback function *every time* an accumulated image is reset
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.reset.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is reset
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.reset.add_once(callback);
				},
			},
			_stop_or_cancel: {
				/**
				 * Execute callback function *every time* an accumulated image is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.stop_or_cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.stop_or_cancel.add_once(callback);
				},
			},

			/** Listen for accumulated image being started */
			get start() {
				return this._start;
			},
			/** Listen for accumulated image being stopped (and saved) */
			get stop() {
				return this._stop;
			},
			/** Listen for accumulated image being paused */
			get pause() {
				return this._pause;
			},
			/** Listen for accumulated image being resumed */
			get resume() {
				return this._resume;
			},
			/** Listen for accumulated image being canceled */
			get cancel() {
				return this._cancel;
			},
			/** Listen for accumulated image being reset */
			get reset() {
				return this._reset;
			},
			/** Listen for accumulated image being stopped *or* canceled */
			get stop_or_cancel() {
				return this._stop_or_cancel;
			},
		};
	}

	/** Set up callback functions to be executed when accumulated image event occurs  */
	get scan() {
		return this._scan;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class IMMessengerCallbackInfoUpdate {
	constructor() {
		this._image = {
			_id: {
				/**
				 * Execute callback function *every time* Image ID is updated
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `id {Number}`: ID of the current image
				 */
				on: (callback) => {
					IMAlerts.info_update.image.id.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* Image ID is updated
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `id {Number}`: ID of the current image
				 */
				once: (callback) => {
					IMAlerts.info_update.image.id.add_once(callback);
				},
			},
			_file_name: {
				/** Callback called with argument `file_name {String}` */
				on: (callback) => {
					IMAlerts.info_update.image.file_name.add_on(callback);
				},
				/** Callback called with argument `file_name {String}` */
				once: (callback) => {
					IMAlerts.info_update.image.file_name.add_once(callback);
				},
			},
			_file_name_ir: {
				/** Callback called with argument `file_name_ir {String}` */
				on: (callback) => {
					IMAlerts.info_update.image.file_name_ir.add_on(callback);
				},
				/** Callback called with argument `file_name_ir {String}` */
				once: (callback) => {
					IMAlerts.info_update.image.file_name_ir.add_once(callback);
				},
			},
			_counts: {
				/** Callback called with argument `counts {Image.counts}` */
				on: (callback) => {
					IMAlerts.info_update.image.counts.add_on(callback);
				},
				/** Callback called with argument `counts {Image.counts}` */
				once: (callback) => {
					IMAlerts.info_update.image.counts.add_once(callback);
				},
			},
			_vmi_info: {
				/** Callback called with argument `vmi_info {Image.vmi_info}` */
				on: (callback) => {
					IMAlerts.info_update.image.vmi_info.add_on(callback);
				},
				/** Callback called with argument `vmi_info {Image.vmi_info}` */
				once: (callback) => {
					IMAlerts.info_update.image.vmi_info.add_once(callback);
				},
			},

			get id() {
				return this._id;
			},
			get file_name() {
				return this._file_name;
			},
			get file_name_ir() {
				return this._file_name_ir;
			},
			get counts() {
				return this._counts;
			},
			get vmi_info() {
				return this._vmi_info;
			},
		};

		this._image_contrast = {
			/** Callback called with argument `contrast_value {Number}` */
			on: (callback) => {
				IMAlerts.info_update.contrast.add_on(callback);
			},
			/** Callback called with argument `contrast_value {Number}` */
			once: (callback) => {
				IMAlerts.info_update.contrast.add_once(callback);
			},
		};

		this._autostop = {
			_params: {
				/** Callback called with argument `autostop_params {Object: { method: {AutostopMethod}, value: {Number} }}` */
				on: (callback) => {
					IMAlerts.info_update.autostop.params.add_on(callback);
				},
				/** Callback called with argument `autostop_params {Object: { method: {AutostopMethod}, value: {Number} }}` */
				once: (callback) => {
					IMAlerts.info_update.autostop.params.add_once(callback);
				},
			},
			_progress: {
				/** Callback called with argument `progress {Number}` value between 0-100 */
				on: (callback) => {
					IMAlerts.info_update.autostop.progress.add_on(callback);
				},
				/** Callback called with argument `progress {Number}` value between 0-100 */
				once: (callback) => {
					IMAlerts.info_update.autostop.progress.add_once(callback);
				},
			},

			get params() {
				return this._params;
			},
			get progress() {
				return this._progress;
			},
		};

		this._image_series = {
			_length: {
				/** Callback called with argument `length {Number}` */
				on: (callback) => {
					IMAlerts.info_update.image_series.params.add_on(callback);
				},
				/** Callback called with argument `length {Number}` */
				once: (callback) => {
					IMAlerts.info_update.image_series.params.add_once(callback);
				},
			},
			_remaining: {
				/** Callback called with argument `remaining {Number}` */
				on: (callback) => {
					IMAlerts.info_update.image_series.remaining.add_on(callback);
				},
				/** Callback called with argument `remaining {Number}` */
				once: (callback) => {
					IMAlerts.info_update.image_series.remaining.add_once(callback);
				},
			},

			get length() {
				return this._length;
			},
			get remaining() {
				return this._remaining;
			},
		};
	}

	get image() {
		return this._image;
	}

	get image_contrast() {
		return this._image_contrast;
	}

	get autostop() {
		return this._autostop;
	}

	get image_series() {
		return this._image_series;
	}
}

/*****************************************************************************

						IMAGE MANAGER MESSENGER

*****************************************************************************/

class ImageManagerMessenger {
	constructor() {
		this._information = new IMMessengerInformation();
		this._request = new IMMessengerRequest();
		this._update = new IMMessengerUpdate();
		this._listen = new IMMessengerCallback();
	}

	get information() {
		return this._information;
	}
	get request() {
		return this._request;
	}
	get update() {
		return this._update;
	}
	get listen() {
		return this._listen;
	}
}

module.exports = { ImageManagerMessenger, IMState, AutostopMethod };
