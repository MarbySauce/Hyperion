/************************************************** 

		Control for IR Action Mode

**************************************************/

const { performance } = require("perf_hooks");
const { ManagerAlert } = require("./ManagerAlert.js");
const { ExcitationWavelength, ExcitationMode } = require("./WavelengthClasses.js");
const { ExcitationLaserManagerMessenger } = require("./ExcitationLaserManager.js");
const { ImageManagerMessenger } = require("./ImageManager.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

const IMMessenger = new ImageManagerMessenger();
const ELMMessenger = new ExcitationLaserManagerMessenger();

class ActionImage {
	constructor() {
		this.excitation_energy = new ExcitationWavelength();
		this.expected_excitation_energy = new ExcitationWavelength();
		this.image_id; // Image ID
		this.image_id_str;
		this.step_image_number = 0; // Image number within set of images / step
	}
}

class ActionOptions {
	constructor() {
		this.initial_energy;
		this.final_energy;
		this.step_size;
		this.images_per_step;
	}
}

class ImageAmountInfo {
	/**
	 * @param {ActionImage} action_image
	 * @param {Number} image_queue_length
	 * @param {Number} completed_image_length
	 */
	constructor(action_image, image_queue_length, completed_image_length) {
		this.image_id = action_image.image_id;
		this.image_id_str = action_image.image_id_str;
		this.image_number = completed_image_length + 1;
		this.total_image_number = completed_image_length + image_queue_length + 1;
	}
}

class ActionDuration {
	constructor(duration /* ms */) {
		this.duration = duration;
		this.ms, this.seconds, this.minutes, this.hours;
		this.convert();
	}

	convert() {
		let time = this.duration;
		this.hours = Math.floor(time / (60 * 60 * 1000));
		let hours_remainder = time % (60 * 60 * 1000);
		this.minutes = Math.floor(hours_remainder / (60 * 1000));
		let minutes_remainder = hours_remainder % (60 * 1000);
		this.seconds = Math.floor(minutes_remainder / 1000);
		this.ms = minutes_remainder % 1000;
	}
}

class ActionState {
	static RUNNING = new ActionState();
	static PAUSED = new ActionState();
	static STOPPED = new ActionState();
}

/*****************************************************************************

							IR ACTION MANAGER

*****************************************************************************/

const IRActionManager = {
	status: ActionState.STOPPED,
	params: {
		initial_energy: 0, // cm-1
		final_energy: 0, // cm-1
		step_size: 0, // cm-1
		images_per_step: 1,
		move_wavelenght_every_time: false,
		acceptance_range: 0.75,
	},

	duration: {
		start_time: 0,
		end_time: 0,
		length: 0, // Elapsed time in ms
		update: {
			frequency: 100,
			count: 0,
		},
		start: () => {
			IRActionManager.duration.start_time = performance.now();
		},
		end: () => {
			IRActionManager.duration.end_time = performance.now();
			IRActionManager.duration.length = IRActionManager.duration.end_time - IRActionManager.duration.start_time;
			return IRActionManager.duration.length;
		},
	},
	current_image: undefined,
	image_queue: [],
	completed_images: [],
	start_scan: () => IRActionManager_start_scan(),
	stop_scan: () => IRActionManager_stop_scan(),
	pause_scan: () => IRActionManager_pause_scan(),
	resume_scan: () => IRActionManager_resume_scan(),
	cancel_scan: () => IRActionManager_cancel_scan(),
	remeasure_wavelength: () => IRActionManager_remeasure_wavelength(),

	update_options: (action_options) => IRActionManager_update_options(action_options),
	process_settings: (settings) => IRActionManager_process_settings(settings),
};

/****
		IPC Event Listeners
****/

// Update the duration status of the Action Scan after `IRActionManager.duration.update.frequency` camera frames
ipc.on(IPCMessages.UPDATE.NEWFRAME, () => {
	if (IRActionManager.status === ActionState.STOPPED) {
		return; // Don't update if scan is not running
	}
	if (IRActionManager.duration.update.count >= IRActionManager.duration.update.frequency) {
		// Send update with current action scan duration
		IRActionManager.duration.end();
		IRAMAlerts.info_update.duration.alert(new ActionDuration(IRActionManager.duration.length));
		IRActionManager.duration.update.count = 0;
	}
	IRActionManager.duration.update.count++;
});

/****
		Image Manager Listeners
****/

IMMessenger.listen.event.scan.start.on(() => {
	if (IRActionManager.status !== ActionState.STOPPED) IRAMAlerts.event.image.start.alert();
});

IMMessenger.listen.event.scan.stop_or_cancel.on(() => {
	if (IRActionManager.status !== ActionState.STOPPED) IRAMAlerts.event.image.stop.alert();
});

/****
		Excitation Laser Manager Listeners
****/

ELMMessenger.listen.event.goto.start.on(() => {
	if (IRActionManager.status !== ActionState.STOPPED) IRAMAlerts.event.goto.start.alert();
});

ELMMessenger.listen.event.goto.stop_or_cancel.on(() => {
	if (IRActionManager.status !== ActionState.STOPPED) IRAMAlerts.event.goto.stop.alert();
});

/****
		Functions
****/

function IRActionManager_start_scan() {
	// Reset completed image list and image queue
	IRActionManager.completed_images = [];
	IRActionManager.image_queue = [];

	// Make sure image series collection length is set to 1
	IMMessenger.update.image_series(1);

	initialize_action_queue();
	run_action_scan();
}

function IRActionManager_stop_scan() {
	// Reset image queue so no more images are taken
	IRActionManager.image_queue = [];
	// If we're in a GoTo movement, we should cancel
	ELMMessenger.request.goto.cancel();
	// If we're collecting an IR-SEVI image, we should stop it
	IMMessenger.request.scan.stop();
}

function IRActionManager_pause_scan() {
	if (IRActionManager.status !== ActionState.RUNNING) {
		return;
	}
	IRActionManager.status = ActionState.PAUSED;
	// Send requests to pause image or goto movement
	ELMMessenger.request.goto.pause();
	IMMessenger.request.scan.pause();
	// Alert that action scan is paused
	IRAMAlerts.event.scan.pause.alert();
}

function IRActionManager_resume_scan() {
	if (IRActionManager.status !== ActionState.PAUSED) {
		return;
	}
	IRActionManager.status = ActionState.RUNNING;
	// If we're remeasuring excitation wavelength, it should be canceled
	ELMMessenger.wavemeter.request.measurement.cancel();
	// Send requests to resume paused image or goto movement
	ELMMessenger.request.goto.resume();
	IMMessenger.request.scan.resume();
	// Alert that action scan has been resumed
	IRAMAlerts.event.scan.resume.alert();
}

function IRActionManager_cancel_scan() {
	// Send requests to cancel image or goto movement
	ELMMessenger.request.goto.cancel();
	IMMessenger.request.scan.cancel();
	IRAMAlerts.event.scan.cancel.alert();
	IRAMAlerts.event.scan.stop_or_cancel.alert();
}

async function IRActionManager_remeasure_wavelength() {
	if (!IRActionManager.current_image) return;
	// Send alert that wavelength is being remeasured
	IRAMAlerts.event.remeasure.start.alert();
	// Pause IR Action scan
	IRActionManager.pause_scan();
	// Tell excitation laser to measure wavelength and wait for its result
	let current_wavelength = await ELMMessenger.wavemeter.request.measurement.start();
	// If the newly measured wavelength is 0 (i.e. failed measurement), don't update anything
	if (current_wavelength.wavelength !== 0) {
		IRActionManager.current_image.excitation_energy.nIR.wavelength = current_wavelength.wavelength;
		IRAMAlerts.info_update.energy.current.alert(IRActionManager.current_image.excitation_energy);
	}
	// Resume IR Action scan
	IRActionManager.resume_scan();
	// Send alert that remeasurement is done
	IRAMAlerts.event.remeasure.stop.alert();
}

function IRActionManager_update_options(action_options) {
	if (action_options.initial_energy) IRActionManager.params.initial_energy = action_options.initial_energy;
	if (action_options.final_energy) IRActionManager.params.final_energy = action_options.final_energy;
	if (action_options.step_size) IRActionManager.params.step_size = action_options.step_size;
	if (action_options.images_per_step) IRActionManager.params.images_per_step = action_options.images_per_step;
	// If we're in the middle of an action scan, reinitialize queue
	if (IRActionManager.status !== ActionState.STOPPED) {
		initialize_action_queue(); // Reinitialize queue
		// Update Action scan status
		let current_image = IRActionManager.current_image;
		let completed_image_length = IRActionManager.completed_images.length;
		let image_queue_length = IRActionManager.image_queue.length;
		let image_amount_info = new ImageAmountInfo(current_image, image_queue_length, completed_image_length);
		IRAMAlerts.info_update.image_amount.alert(image_amount_info);
		IRAMAlerts.info_update.energy.next.alert(IRActionManager.image_queue[0]?.expected_excitation_energy);
	}
}

function IRActionManager_process_settings(settings) {
	if (settings?.action) IRActionManager.params.move_wavelenght_every_time = settings.action.move_wavelenght_every_time;
	if (settings?.laser?.excitation) IRActionManager.params.acceptance_range = settings.laser.excitation.acceptance_range;
}

function initialize_action_queue() {
	// If we're initializing the queue for the first time (i.e. completed images is empty)
	//	then we just look at action parameters
	// If not, we need to figure out where in the queue we are and where to go next
	let initial_energy, final_energy, step_size;
	let step_image_number = 0;
	if (IRActionManager.current_image) {
		// Options were updated during a scan - only add images that come after current image
		initial_energy = IRActionManager.current_image.expected_excitation_energy.energy.wavenumber;
		step_image_number = IRActionManager.current_image.step_image_number + 1;
	} else {
		initial_energy = IRActionManager.params.initial_energy;
	}

	final_energy = IRActionManager.params.final_energy;
	step_size = IRActionManager.params.step_size;
	// If we're moving from lower to higher energy, need to make sure step size is >0
	if (final_energy > initial_energy && step_size < 0) step_size *= -1;
	// If we're moving from higher to lower energy, need to make sure step size is <0
	else if (final_energy < initial_energy && step_size > 0) step_size *= -1;
	// Reset image queue
	IRActionManager.image_queue = [];
	// Add the remaining images
	let action_image;
	for (
		let energy = initial_energy;
		Math.abs(energy - initial_energy) < Math.abs(final_energy - initial_energy + step_size / 2);
		energy += step_size
	) {
		for (let i = step_image_number; i < IRActionManager.params.images_per_step; i++) {
			action_image = new ActionImage();
			action_image.expected_excitation_energy.get_nir({ wavenumber: energy });
			console.log(
				`New queued image: (${
					action_image.expected_excitation_energy.selected_mode_str
				}) ${action_image.expected_excitation_energy.energy.wavenumber.toFixed(3)} cm-1`
			);
			action_image.step_image_number = i;
			IRActionManager.image_queue.push(action_image);
		}
		step_image_number = 0;
	}
}

// Before this function, the image queue will already have been set up
async function run_action_scan() {
	// Make sure any currently running images are stopped
	IMMessenger.request.scan.stop();

	IRActionManager.status = ActionState.RUNNING;
	IRActionManager.duration.start();
	// Alert that a scan has started
	IRAMAlerts.event.scan.start.alert();
	// Send update about next wavelength
	IRAMAlerts.info_update.energy.next.alert(IRActionManager.image_queue[0]?.expected_excitation_energy);

	let current_image, current_wavelength;
	let last_image = IRActionManager.completed_images[IRActionManager.completed_images.length - 1];
	let last_energy = last_image?.excitation_energy.energy.wavenumber || 0; // last_image will be undefined if completed_images is blank
	let desired_energy;
	let move_wavelength = true;
	let image_amount_info, completed_image_length, image_queue_length;
	while (IRActionManager.image_queue.length > 0) {
		// Get current image by removing it from beginning of queue
		current_image = IRActionManager.image_queue.shift();
		IRActionManager.current_image = current_image; // Store current image so we can access it outside of loop

		// Update image ID and send info
		current_image.image_id = IMMessenger.information.image_info.id;
		current_image.image_id_str = IMMessenger.information.image_info.id_str;
		completed_image_length = IRActionManager.completed_images.length;
		image_queue_length = IRActionManager.image_queue.length;
		image_amount_info = new ImageAmountInfo(current_image, image_queue_length, completed_image_length);
		IRAMAlerts.info_update.image_amount.alert(image_amount_info);

		// Check whether to move OPO wavelength
		last_image = IRActionManager.completed_images[IRActionManager.completed_images.length - 1];
		last_energy = last_image?.excitation_energy.energy.wavenumber || 0;
		desired_energy = current_image.expected_excitation_energy.energy.wavenumber;
		if (IRActionManager.params.move_wavelenght_every_time) {
			// If wavelength is within acceptance range of desired energy, don't move
			move_wavelength = Math.abs(desired_energy - last_energy) > IRActionManager.params.acceptance_range;
		} else {
			// Only want to move if we're on the first image in the series of images / step (i.e. step_image_number = 0)
			move_wavelength = current_image.step_image_number === 0;
		}

		// Move OPO wavelength if necessary
		if (move_wavelength) {
			current_wavelength = await ELMMessenger.request.goto.start(desired_energy);
			// current_wavelength will be an ExcitationWavelength instance unless the goto movement was canceled
			//	in which case it will be undefined
			if (!current_wavelength) {
				break; // Action scan (or GoTo at least) was canceled
			}
			// GoTo movement was successful:
			current_image.excitation_energy.nIR.wavelength = current_wavelength.nIR.wavelength;
			current_image.excitation_energy.selected_mode = current_wavelength.selected_mode;
		} else {
			// Update excitation_energy with that of the last image
			last_image = IRActionManager.completed_images[IRActionManager.completed_images.length - 1];
			current_image.excitation_energy.nIR.wavelength = last_image?.excitation_energy.nIR.wavelength;
			current_image.excitation_energy.selected_mode = last_image?.excitation_energy.selected_mode;
		}

		// Send info about current and next IR energies
		IRAMAlerts.info_update.energy.current.alert(current_image.excitation_energy);
		IRAMAlerts.info_update.energy.next.alert(IRActionManager.image_queue[0]?.expected_excitation_energy);
		console.log(
			`Collecting image i${current_image.image_id_str} - (${
				current_image.excitation_energy.selected_mode_str
			}) ${current_image.excitation_energy.energy.wavenumber.toFixed(
				3
			)} cm-1 (Expected: ${current_image.expected_excitation_energy.energy.wavenumber.toFixed(3)} cm-1)`
		);

		// Start an IR-SEVI scan and wait for it to complete (or be canceled)
		try {
			await IMMessenger.request.scan.start_ir(true);
		} catch (error) {
			// IR-SEVI scan was canceled
			break;
		}

		// Add current image to completed_image list and move on
		IRActionManager.completed_images.push(current_image);
		// Remove current_image from global storage
		IRActionManager.current_image = undefined;
	}

	// Remove current_image from global storage
	IRActionManager.current_image = undefined;

	IRActionManager.duration.end();
	IRActionManager.status = ActionState.STOPPED;
	IRAMAlerts.event.scan.stop.alert();
	IRAMAlerts.event.scan.stop_or_cancel.alert();
	IRAMAlerts.info_update.duration.alert(new ActionDuration(IRActionManager.duration.length));
}

/*****************************************************************************

						IR ACTION MANAGER ALERTS

*****************************************************************************/

const IRAMAlerts = {
	event: {
		scan: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
			pause: new ManagerAlert(),
			resume: new ManagerAlert(),
			cancel: new ManagerAlert(),
			stop_or_cancel: new ManagerAlert(),
		},
		image: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
		},
		goto: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
		},
		remeasure: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
		},
	},
	info_update: {
		energy: {
			current: new ManagerAlert(),
			next: new ManagerAlert(),
		},
		duration: new ManagerAlert(),
		image_amount: new ManagerAlert(),
	},
};

/*****************************************************************************

				IR ACTION MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from IR Action Manager */
class IRAMMessengerInformation {
	constructor() {
		this._status = {
			/** Whether an IR Action scan is currently being taken */
			get running() {
				return IRActionManager.status === ActionState.RUNNING;
			},
			/** Whether an IR Action scan is currently paused */
			get paused() {
				return IRActionManager.status === ActionState.PAUSED;
			},
			/** Whether an IR Action scan is not currently being taken */
			get stopped() {
				return IRActionManager.status === ActionState.STOPPED;
			},
		};
	}

	/** Currently stored IR Action options */
	get options() {
		let current_options = new ActionOptions();
		current_options.initial_energy = IRActionManager.params.initial_energy;
		current_options.final_energy = IRActionManager.params.final_energy;
		current_options.step_size = IRActionManager.params.step_size;
		current_options.images_per_step = IRActionManager.params.images_per_step;
		return current_options;
	}

	/** Status of IR Action scan */
	get status() {
		return this._status;
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request IR Action Manager take action */
class IRAMMessengerRequest {
	constructor() {
		this._scan = {
			/** Start taking an IR Action scan */
			start: () => {
				IRActionManager.start_scan();
			},
			/** Stop current IR Action scan (save current image) */
			stop: () => {
				IRActionManager.stop_scan();
			},
			/** Pause current IR Action scan */
			pause: () => {
				IRActionManager.pause_scan();
			},
			/** Resume current IR Action scan if paused */
			resume: () => {
				IRActionManager.resume_scan();
			},
			/** Cancel current IR Action scan */
			cancel: () => {
				IRActionManager.cancel_scan();
			},
		};
	}

	/** Take action related to IR Action scan */
	get scan() {
		return this._scan;
	}

	/** Remeasure current nIR wavelength */
	remeasure_wavelength() {
		IRActionManager.remeasure_wavelength();
	}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request IR Action Manager information be updated or changed */
class IRAMMessengerUpdate {
	constructor() {}

	/**
	 * Update IR Action scan options
	 * @param {ActionOptions} action_options
	 */
	options(action_options) {
		IRActionManager.update_options(action_options);
	}

	/**
	 * Update IR Action Manager parameters based on settings
	 * @param {Object} settings
	 */
	process_settings(settings) {
		IRActionManager.process_settings(settings);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class IRAMMessengerCallback {
	constructor() {
		this._event = new IRAMMessengerCallbackEvent();
		this._info_update = new IRAMMessengerCallbackInfoUpdate();
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
class IRAMMessengerCallbackEvent {
	constructor() {
		this._scan = {
			_start: {
				/**
				 * Execute callback function *every time* an IR Action scan is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* an IR Action scan is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.stop.add_once(callback);
				},
			},
			_pause: {
				/**
				 * Execute callback function *every time* an IR Action scan is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.pause.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.pause.add_once(callback);
				},
			},
			_resume: {
				/**
				 * Execute callback function *every time* an IR Action scan is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.resume.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.resume.add_once(callback);
				},
			},
			_cancel: {
				/**
				 * Execute callback function *every time* an IR Action scan is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.cancel.add_once(callback);
				},
			},
			_stop_or_cancel: {
				/**
				 * Execute callback function *every time* an IR Action scan is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.scan.stop_or_cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an IR Action scan is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.scan.stop_or_cancel.add_once(callback);
				},
			},

			/** Listen for IR Action scan being started */
			get start() {
				return this._start;
			},
			/** Listen for IR Action scan being stopped */
			get stop() {
				return this._stop;
			},
			/** Listen for IR Action scan being paused */
			get pause() {
				return this._pause;
			},
			/** Listen for IR Action scan being resumed */
			get resume() {
				return this._resume;
			},
			/** Listen for IR Action scan being canceled */
			get cancel() {
				return this._cancel;
			},
			/** Listen for IR Action scan being stopped *or* canceled */
			get stop_or_cancel() {
				return this._stop_or_cancel;
			},
		};

		this._image = {
			_start: {
				/**
				 * Execute callback function *every time* an accumulated image is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.image.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.image.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* an accumulated image is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.image.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* an accumulated image is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.image.stop.add_once(callback);
				},
			},

			/** Listen for accumulated image being started during an IR Action scan */
			get start() {
				return this._start;
			},
			/** Listen for accumulated image being stopped during an IR Action scan */
			get stop() {
				return this._stop;
			},
		};

		this._goto = {
			_start: {
				/**
				 * Execute callback function *every time* a GoTo process is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.goto.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.goto.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* a GoTo process is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.goto.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.goto.stop.add_once(callback);
				},
			},

			/** Listen for GoTo process being started during an IR Action scan */
			get start() {
				return this._start;
			},
			/** Listen for GoTo process being stopped during an IR Action scan */
			get stop() {
				return this._stop;
			},
		};

		this._remeasure = {
			_start: {
				/**
				 * Execute callback function *every time* wavelength remeasure is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.remeasure.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* wavelength remeasure is started during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.remeasure.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* wavelength remeasure is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IRAMAlerts.event.remeasure.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* wavelength remeasure is stopped during an IR Action scan
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IRAMAlerts.event.remeasure.start.add_once(callback);
				},
			},

			/** Listen for wavelength remeasure being started during an IR Action scan */
			get start() {
				return this._start;
			},
			/** Listen for wavelength remeasure being stopped during an IR Action scan */
			get stop() {
				return this._stop;
			},
		};
	}

	/** Set up callback functions to be executed when IR Action scan event occurs  */
	get scan() {
		return this._scan;
	}

	/** Set up callback functions to be executed when accumulated image event occurs during IR Action scan */
	get image() {
		return this._image;
	}

	/** Set up callback functions to be executed when GoTo event occurs during IR Action scan */
	get goto() {
		return this._goto;
	}

	/** Set up callback functions to be executed when wavelength remeasure event occurs during IR Action scan */
	get remeasure() {
		return this._remeasure;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class IRAMMessengerCallbackInfoUpdate {
	constructor() {
		this._energy = {
			_current: {
				/**
				 * Execute callback function *every time* current energy is updated during IR Action scan
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `stored_wavelength {ExcitationWavlength}`: IR energy of current image
				 */
				on: (callback) => {
					IRAMAlerts.info_update.energy.current.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* current energy is updated during IR Action scan
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `stored_wavelength {ExcitationWavlength}`: IR energy of current image
				 */
				once: (callback) => {
					IRAMAlerts.info_update.energy.current.add_once(callback);
				},
			},
			_next: {
				/**
				 * Execute callback function *every time* next energy is updated during IR Action scan
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `next_wavelength {ExcitationWavlength}`: IR energy of next image
				 */
				on: (callback) => {
					IRAMAlerts.info_update.energy.next.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* next energy is updated during IR Action scan
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `next_wavelength {ExcitationWavlength}`: IR energy of next image
				 */
				once: (callback) => {
					IRAMAlerts.info_update.energy.next.add_once(callback);
				},
			},

			/** Listen for IR energy of current image being udpated */
			get current() {
				return this._current;
			},
			/** Listen for IR energy of next image being udpated */
			get next() {
				return this._next;
			},
		};

		this._duration = {
			/**
			 * Execute callback function *every time* duration is updated during IR Action scan
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `duration {ActionDuration}`: Current duration of IR Action scan
			 */
			on: (callback) => {
				IRAMAlerts.info_update.duration.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* duration is updated during IR Action scan
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `duration {ActionDuration}`: Current duration of IR Action scan
			 */
			once: (callback) => {
				IRAMAlerts.info_update.duration.add_once(callback);
			},
		};

		this._image_amount = {
			/**
			 * Execute callback function *every time* image amount is updated during IR Action scan
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `image_amount_info {ImageAmountInfo}`: Current image amount info of IR Action scan
			 */
			on: (callback) => {
				IRAMAlerts.info_update.image_amount.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* image amount is updated during IR Action scan
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `image_amount_info {ImageAmountInfo}`: Current image amount info of IR Action scan
			 */
			once: (callback) => {
				IRAMAlerts.info_update.image_amount.add_once(callback);
			},
		};
	}

	get energy() {
		return this._energy;
	}

	get duration() {
		return this._duration;
	}

	get image_amount() {
		return this._image_amount;
	}
}

/*****************************************************************************

					IR ACTION MANAGER MESSENGER

*****************************************************************************/

class IRActionManagerMessenger {
	constructor() {
		this._information = new IRAMMessengerInformation();
		this._request = new IRAMMessengerRequest();
		this._update = new IRAMMessengerUpdate();
		this._listen = new IRAMMessengerCallback();
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

module.exports = { IRActionManagerMessenger, ImageAmountInfo, ActionDuration, ActionOptions };
