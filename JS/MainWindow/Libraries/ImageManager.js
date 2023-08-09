/************************************************** 

	Control for Accumulated Image Collection

**************************************************/

const ipc = require("electron").ipcRenderer;
const { Image, IRImage, EmptyIRImage, ImageType, ScanInfo } = require("./ImageClasses.js");
const { ManagerAlert } = require("./ManagerAlert.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");
const { DetachmentLaserManagerMessenger } = require("./DetachmentLaserManager.js");
const { ExcitationLaserManagerMessenger } = require("./ExcitationLaserManager.js");
const { IPCMessages } = require("../../Messages.js");

const update_messenger = new UpdateMessenger(); // Messenger used for displaying update or error messages to the Message Display
const DLMMessenger = new DetachmentLaserManagerMessenger();
const ELMMessenger = new ExcitationLaserManagerMessenger();

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
		do_not_save_to_file: false,
		camera: {
			// Only used for saving single shots
			width: 0,
			height: 0,
		},
	},
	info: {
		vmi: {},
		save_directory: "",
	},
	autosave: {
		on: false, // whether to autosave image to file while collecting
		delay: 2000, // # of camera frames between autosaves (camera frames come in at 20Hz)
		counter: 0,
		check: () => ImageManager_autosave_check(),
		update_info: (autosave_params) => ImageManager_autosave_update_info(autosave_params),
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
	melexir: {
		worker: undefined,
		params: {
			process_on_save: false,
			save_spectrum: false,
			save_best_fit: false,
			save_residuals: false,
		},
		process_image: (save_to_file) => ImageManager_melexir_process_image(save_to_file),
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

	single_shot: (ir_only) => {
		ipc.once(IPCMessages.UPDATE.NEWFRAME, (event, centroid_results) => {
			if (ir_only && !centroid_results.is_led_on) ImageManager.single_shot(ir_only); // Try again until we get IR image
			else ImageManager_single_shot(centroid_results);
		});
	},

	save_scan_information: () => ImageManager_save_scan_information(),
	read_scan_information: () => ImageManager_read_scan_information(),
	update_information: (image_class) => ImageManager_update_information(image_class),

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
	// Check if image should be autosaved
	ImageManager.autosave.check();
});

/****
		Laser Manager Listeners
****/

// Update detachment energy/measurement information stored in current_image
DLMMessenger.listen.info_update.energy.on((stored_energy) => {
	ImageManager.current_image.detachment_wavelength = stored_energy;
});
DLMMessenger.listen.info_update.measurement.on((measurement) => {
	ImageManager.current_image.detachment_measurement = measurement;
});

// Update excitation energy/measurement information stored in current_image
ELMMessenger.listen.info_update.energy.on((stored_energy) => {
	ImageManager.current_image.excitation_wavelength = stored_energy;
});
ELMMessenger.listen.info_update.measurement.on((measurement) => {
	ImageManager.current_image.excitation_measurement = measurement;
});

/****
		Functions
****/

/* Autosaving images */

function ImageManager_autosave_check() {
	if (!ImageManager.autosave.on) return; // Autosave is turned off
	if (ImageManager.status === IMState.RUNNING) {
		if (ImageManager.autosave.counter >= ImageManager.autosave.delay) {
			ImageManager.current_image.save_image();
			ImageManager.autosave.counter = 0;
		} else {
			ImageManager.autosave.counter++;
		}
	} else if (ImageManager.status === IMState.STOPPED) {
		ImageManager.autosave.counter = 0;
	}
}

function ImageManager_autosave_update_info(autosave_params) {
	if (autosave_params?.on !== undefined) {
		ImageManager.autosave.on = autosave_params.on;
		if (settings?.autosave) settings.autosave.on = ImageManager.autosave.on;
	}
	if (autosave_params?.delay) {
		ImageManager.autosave.delay = autosave_params.delay;
		if (settings?.autosave) settings.autosave.delay = ImageManager.autosave.delay;
	}
	// Alert settings were updated
	IMAlerts.info_update.autosave.params.alert({ on: ImageManager.autosave.on, delay: ImageManager.autosave.delay });
}

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
	if (autostop_params?.method && autostop_params?.value) {
		// Update both
		ImageManager.autostop.method = autostop_params.method;
		if (autostop_params.method === AutostopMethod.ELECTRONS) {
			ImageManager.autostop.value.electrons = autostop_params.value;
		} else if (autostop_params.method === AutostopMethod.FRAMES) {
			ImageManager.autostop.value.frames = autostop_params.value;
		}
	} else if (autostop_params?.method) {
		// Only update method
		ImageManager.autostop.method = autostop_params.method;
	} else if (autostop_params?.value) {
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

/* Running Melexir / Meveler */

function ImageManager_melexir_process_image(save_to_file) {
	if (ImageManager.melexir.worker) {
		// Worker already exists (which means it's already processing something)
		return;
	}

	// Figure out which image to process
	// If there is a current image, process that
	// If not, process last image (if it is not empty)

	let image_class;
	if (ImageManager.current_image.is_empty) {
		if (ImageManager.last_image.is_empty) {
			// Neither image has an accumulated image, do nothing
			return;
		} else {
			image_class = ImageManager.last_image;
		}
	} else {
		image_class = ImageManager.current_image;
	}

	IMAlerts.event.melexir.start.alert();

	let initial_id = image_class.id;

	ImageManager.melexir.worker = new Worker("../JS/MainWindow/MLXRWorker.js");
	let worker = ImageManager.melexir.worker;

	image_class.pe_spectrum.update_settings(ImageManager.melexir.params);

	let melexir_arguments = {};
	if (image_class.is_ir) {
		melexir_arguments.is_ir = true;
		melexir_arguments.images = {
			ir_off: image_class.images.ir_off,
			ir_on: image_class.images.ir_on,
		};
	} else {
		melexir_arguments.is_ir = false;
		melexir_arguments.image = image_class.image;
	}

	worker.postMessage(melexir_arguments);

	// Wait for Melexir to complete
	worker.onmessage = (event) => {
		if (event.data.is_ir) {
			image_class.pe_spectrum.update(event.data.results_off, event.data.results_on);
		} else {
			image_class.pe_spectrum.update(event.data.results);
		}
		ImageManager.melexir.worker.terminate();
		ImageManager.melexir.worker = undefined;

		if (save_to_file && !ImageManager.params.do_not_save_to_file) {
			image_class.pe_spectrum.save_files();
		}

		IMAlerts.event.melexir.stop.alert();
	};
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
	// Update (new) current image info with that from (old) current image
	new_image.update_information(ImageManager.current_image);
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
	// Save scan information to file
	ImageManager.save_scan_information();
	// If the option is set, process image with Melexir
	if (ImageManager.melexir.params.process_on_save) ImageManager.melexir.process_image(true);
	// Move current image to last image, and empty current image
	// But first, delete the accumulated image in last_image to save memory
	ImageManager.last_image.delete_image();
	ImageManager.last_image = ImageManager.current_image;
	EmptyImage.update_information(ImageManager.current_image); // Transfer information to Empty Image
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
	// Also update electron counters and autostop progress
	IMAlerts.info_update.image.counts.alert(ImageManager.current_image.counts);
	IMAlerts.info_update.autostop.progress.alert(0);
	update_messenger.update("(IR) SEVI Scan Reset!");
}

function ImageManager_get_image_display(which_image) {
	let image_obj;
	if (ImageManager.current_image.is_empty) image_obj = ImageManager.last_image;
	else image_obj = ImageManager.current_image;
	let contrast = ImageManager.params.image_contrast;
	return image_obj.get_image_display(which_image, contrast);
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

async function ImageManager_single_shot(centroid_results) {
	// If in testing mode, don't save anything
	if (ImageManager.params.do_not_save_to_file) {
		update_messenger.update("Single shot saved to file! (Not really)");
		return;
	}
	const fs = require("fs");
	const { access } = require("fs/promises");
	const path = require("path");

	let get_file_name = (id) => `single_shot_${id}.txt`;
	let get_centroids_file_name = (id) => `single_shot_${id}_centroids.txt`;

	let save_dir = ImageManager.info.save_directory;
	let id = 1;
	// Iterate through file names until we find a file that doesn't exist yet
	while (true) {
		let file_name = path.join(save_dir, get_file_name(id));
		try {
			await access(file_name);
			// File exists. Increment id and continue
			id++;
		} catch {
			// If we're here, that file does not exist, save there
			let ss_string = convert_single_shot_to_string(centroid_results.image_buffer);
			fs.writeFile(path.join(save_dir, get_file_name(id)), ss_string, (error) => {
				if (error) console.log("Could not save single shot!", error);
				else update_messenger.update(`Single shot saved to ${get_file_name(id)}!`);
			});
			let ssc_string = convert_single_shot_centroids_to_string(centroid_results);
			fs.writeFile(path.join(save_dir, get_centroids_file_name(id)), ssc_string, (error) => {
				if (error) console.log("Could not save single shot centroids!", error);
			});
			break;
		}
		if (id > 100) break; // So we aren't stuck in infinite loop
	}

	function convert_single_shot_to_string(buffer) {
		// Image buffer is RGBA, we only want alpha values
		let { width, height } = ImageManager.params.camera;
		let alpha_index;
		let ss_string = "";
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				alpha_index = 4 * (width * y + x) + 3;
				ss_string += (255 - buffer[alpha_index]).toString() + " ";
			}
			ss_string += "\n";
		}
		return ss_string;
	}
	function convert_single_shot_centroids_to_string(centroid_results) {
		let ssc_string = "";
		ssc_string += `CoM Centroids \n${centroid_results.com_centers.map((row) => row.slice(0, 2).join(", ")).join("\n")} \n\n`;
		ssc_string += `HGCM Centroids \n${centroid_results.hgcm_centers.map((row) => row.slice(0, 2).join(", ")).join("\n")}`;
		return ssc_string;
	}
}

function ImageManager_save_scan_information() {
	// If in testing mode, don't save anything
	if (ImageManager.params.do_not_save_to_file) {
		return;
	}
	const fs = require("fs");
	const path = require("path");

	let all_scan_info = [];
	let image_scan_info;
	for (let image of ImageManager.all_images) {
		image_scan_info = image.scan_information;
		// Fill in all VMI calibration constants
		image_scan_info.vmi.all_constants = ImageManager.info.vmi;
		// Package into an object and add to all_scan_info
		all_scan_info.push({ ...image_scan_info });
	}
	// Convert to JSON and save to file
	let save_dir = ImageManager.info.save_directory;
	let file_name = path.join(save_dir, "scan_information.json");
	let json_string = JSON.stringify(all_scan_info, null, "\t");
	fs.writeFile(file_name, json_string, (error) => {
		if (error) {
			update_messenger.error("Could not save scan information to file! Error logged to console");
			console.log("Could not save scan information to file:", error);
		}
	});
}

function ImageManager_read_scan_information() {
	const fs = require("fs");
	const path = require("path");

	let file_name = path.join(ImageManager.info.save_directory, "scan_information.json");
	fs.readFile(file_name, (error, data) => {
		if (error) {
			if (error.code === "ENOENT") {
				// File not found error, don't log error to message display
				return;
			} else {
				update_messenger.error("Could not read scan information from file! Error logged to console");
				console.log("Could not read scan information from file:", error);
				return;
			}
		}
		if (data) {
			let json_data = JSON.parse(data);
			let image_class;
			for (let scan_info of json_data) {
				image_class = ScanInfo.get_image_class(scan_info);
				ImageManager.all_images.push(image_class);
			}
			ImageManager.update_information(image_class);
		}
	});
}

/**
 * @param {Image | IRImage} image_class
 */
function ImageManager_update_information(image_class) {
	// Update information based on that given from scan_information.json
	ImageManager.set_id(image_class.id + 1);
	ImageManager.update_vmi(image_class.vmi_info);
	// Update Laser Manager information
	// Detachment Laser Manager
	DLMMessenger.update.standard_wavelength(image_class.detachment_wavelength.standard.wavelength);
	DLMMessenger.update.standard_mode(image_class.detachment_wavelength.selected_mode);
	// Excitation Laser Manager
	ELMMessenger.update.nir_wavelength(image_class.excitation_wavelength.nIR.wavelength);
	ELMMessenger.update.nir_mode(image_class.excitation_wavelength.selected_mode);
}

function ImageManager_process_settings(settings) {
	if (!settings) return; // settings is blank
	if (settings?.centroid?.hybrid_method !== undefined) ImageManager.params.centroid.use_hybrid_method = settings.centroid.hybrid_method;
	if (settings?.centroid?.bin_size !== undefined) {
		ImageManager.params.centroid.bin_size = settings.centroid.bin_size;
		Image.bin_size = settings.centroid.bin_size;
	}

	if (settings?.camera?.width !== undefined) ImageManager.params.camera.width = settings.camera.width;
	if (settings?.camera?.height !== undefined) ImageManager.params.camera.height = settings.camera.height;

	if (settings?.testing?.do_not_save_to_file !== undefined) {
		ImageManager.params.do_not_save_to_file = settings.testing.do_not_save_to_file;
		Image.do_not_save_to_file = settings.testing.do_not_save_to_file;
	}

	if (settings?.save_directory?.full_dir !== undefined) {
		ImageManager.info.save_directory = settings.save_directory.full_dir;
		Image.save_directory = settings.save_directory.full_dir;
	}

	if (settings?.autosave) ImageManager.autosave.update_info(settings.autosave);

	if (settings?.melexir?.process_on_save !== undefined) ImageManager.melexir.params.process_on_save = settings.melexir.process_on_save;
	if (settings?.melexir?.save_spectrum !== undefined) ImageManager.melexir.params.save_spectrum = settings.melexir.save_spectrum;
	if (settings?.melexir?.save_best_fit !== undefined) ImageManager.melexir.params.save_best_fit = settings.melexir.save_best_fit;
	if (settings?.melexir?.save_residuals !== undefined) ImageManager.melexir.params.save_residuals = settings.melexir.save_residuals;

	if (settings?.vmi !== undefined) ImageManager.info.vmi = settings.vmi;

	if (settings?.autostop?.both_images !== undefined) ImageManager.autostop.both = settings.autostop.both_images;

	ImageManager.read_scan_information();
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
		melexir: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
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
		autosave: {
			params: new ManagerAlert(),
		},
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
			/** Image automatic stop parameters */
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
			/** Image automatic stop progress as number between 0 - 100 */
			get progress() {
				return ImageManager.autostop.progress;
			},
			/** Whether the autostop functionality is currently in use */
			get in_use() {
				return ImageManager.autostop.use_autostop;
			},
		};

		this._autosave = {
			/** Image autosave parameters */
			get params() {
				return { on: ImageManager.autosave.on, delay: ImageManager.autosave.delay };
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

	get autosave() {
		return this._autosave;
	}

	/** Get a safe copy of the current image (note: accumulated image is not copied) */
	get current_image() {
		return ImageManager.current_image.copy();
	}

	/** Get a safe copy of all images stored in Image Manager */
	get all_images() {
		return ImageManager.all_images.map((image) => image.copy());
	}

	/** Get a ScanInfo copy of all images stored in Image Manager */
	get all_image_info() {
		return ImageManager.all_images.map((image) => image.scan_information);
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

	/**
	 * Save next camera frame to file
	 * @param {Boolean} ir_only if true, only take single shot of camera frame with IR LED on
	 */
	single_shot(ir_only) {
		ImageManager.single_shot(ir_only);
	}

	/** @param {Boolean} save_to_file whether to save files after processing */
	process_image(save_to_file) {
		// Process the current image
		ImageManager.melexir.process_image(save_to_file);
	}
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
	 * @param {Object} autostop_params { method: {AutostopMethod}, value: {Number} } - at least 1 property has to be defined
	 */
	autostop(autostop_params) {
		ImageManager.autostop.update_info(autostop_params);
	}

	/**
	 * Update autosave parameters
	 * @param {Object} autosave_params { on: {Boolean}, delay: {Number} } - at least 1 property has to be defined
	 */
	autosave(autosave_params) {
		ImageManager.autosave.update_info(autosave_params);
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

		this._melexir = {
			_start: {
				/**
				 * Execute callback function *every time* Melexir starts processing an accumulated image
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.melexir.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* Melexir starts processing an accumulated image
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.melexir.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* Melexir stops processing an accumulated image
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.melexir.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* Melexir stops processing an accumulated image
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.melexir.stop.add_once(callback);
				},
			},

			/** Listen for Melexir to start processing */
			get start() {
				return this._start;
			},
			/** Listen for Melexir to stop processing */
			get stop() {
				return this._stop;
			},
		};
	}

	/** Set up callback functions to be executed when accumulated image event occurs  */
	get scan() {
		return this._scan;
	}

	/** Set up callback functions to be executed when Melexir is used */
	get melexir() {
		return this._melexir;
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

		this._autosave = {
			_params: {
				/** Callback called with argument `autosave_params {Object: { on: {Boolean}, delay: {Number} }}` */
				on: (callback) => {
					IMAlerts.info_update.autosave.params.add_on(callback);
				},
				/** Callback called with argument `autosave_params {Object: { on: {Boolean}, delay: {Number} }}` */
				once: (callback) => {
					IMAlerts.info_update.autosave.params.add_once(callback);
				},
			},

			get params() {
				return this._params;
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

	get autosave() {
		return this._autosave;
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
	/** WARNING: This function should only be used for testing purposes! */
	static get_manager() {
		console.warn("WARNING: This function should only be used for testing purposes!");
		return ImageManager;
	}

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
