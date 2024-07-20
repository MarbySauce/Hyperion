/************************************************** 

		Control for IR Excitation Laser

**************************************************/

const { ManagerAlert } = require("../../Libraries/ManagerAlert.js");
const { sleep } = require("../../Libraries/Sleep.js");
const { ExcitationWavelength, ExcitationMode } = require("../Libraries/WavelengthClasses.js");
const { WavemeterMeasurement } = require("../Libraries/WavemeterClasses.js");
const { ExcitationWavemeterManagerMessenger } = require("./WavemeterManager.js");
const { OPOManagerMessenger } = require("./OPOManager.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

const EWMMessenger = new ExcitationWavemeterManagerMessenger();
const OPOMMessenger = new OPOManagerMessenger();

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

/**
 * Go To Status Enums
 */
class GoToState {
	/** GoTo movement in progress */
	static RUNNING = new GoToState("RUNNING");
	/** GoTo movement paused */
	static PAUSED = new GoToState("PAUSED");
	/** GoTo movement is not taking place */
	static STOPPED = new GoToState("STOPPED");
}

class GoToStep {
	/** Wavelength is being measured */
	static MEASURING = new GoToStep("MEASURING");
	/** Laser is moving wavelength */
	static MOVING = new GoToStep("MOVING");
	/** GoTo movement is not taking place */
	static NONE = new GoToStep("NONE");
}

/*****************************************************************************

						EXCITATION LASER MANAGER

*****************************************************************************/

const ExcitationLaserManager = {
	stored: new ExcitationWavelength(),
	params: {
		move_attempts: 2,
		acceptance_range: 0.75, // cm-1, how close actual IR energy should be do desired on GoTo call
		wavemeter_channel: -1,
	},
	goto: {
		status: GoToState.STOPPED,
		step: GoToStep.NONE,
		action: {
			cancel: false,
		},

		pause: () => {
			if (ExcitationLaserManager.goto.status !== GoToState.RUNNING) return; // GoTo is not taking place
			ExcitationLaserManager.goto.status = GoToState.PAUSED;
			// Tell wavemeter to pause if measuring
			EWMMessenger.request.measurement.pause();
			ELMAlerts.event.goto.pause.alert();
		},
		resume: () => {
			if (ExcitationLaserManager.goto.status !== GoToState.PAUSED) return; // GoTo is not paused
			ExcitationLaserManager.goto.status = GoToState.RUNNING;
			// Tell wavemeter to resume if measuring
			EWMMessenger.request.measurement.resume();
			ELMAlerts.event.goto.resume.alert();
		},
		cancel: () => {
			if (ExcitationLaserManager.goto.status === GoToState.STOPPED) return; // GoTo is not taking place
			ExcitationLaserManager.goto.action.cancel = true;
			ExcitationLaserManager.goto.status = GoToState.STOPPED;
			// Cancel either OPO or wavemeter measurement
			switch (ExcitationLaserManager.goto.step) {
				case GoToStep.MEASURING:
					EWMMessenger.request.measurement.cancel();
					break;
				case GoToStep.MOVING:
					OPOMMessenger.request.stop_movement();
					break;
			}
			// Update step
			ExcitationLaserManager.goto.step = GoToStep.NONE;
		},
	},
	goto_ir: async (desired_energy) => ExcitationLaserManager_goto_ir(desired_energy),

	update_nir_wavelength: (wavelength) => ExcitationLaserManager_update_nir_wavelength(wavelength),
	update_mode: (mode) => ExcitationLaserManager_update_mode(mode),
	process_settings: (settings) => ExcitationLaserManager_process_settings(settings),
};

/****
		Excitation Wavemeter Manager Listeners
****/

EWMMessenger.listen.info_update.measurement.on((measurement) => {
	// Get OPO wavelength and calculate offset
	let opo_wl = OPOMMessenger.information.wavelength;
	OPOMMessenger.update.laser_offset(measurement.wavelength - opo_wl);
	// Store OPO wavelength and offset
	measurement.laser_wavelength = opo_wl;
	measurement.laser_offset = OPOMMessenger.information.offset;
	// Update about measurement
	ELMAlerts.info_update.measurement.alert(measurement);
	ExcitationLaserManager.update_nir_wavelength(measurement.reduced_stats.average);
});

/****
		Functions
****/

function ExcitationLaserManager_update_nir_wavelength(wavelength) {
	if (wavelength) {
		ExcitationLaserManager.stored.nIR.wavelength = wavelength;
	} else {
		ExcitationLaserManager.stored.nIR.wavelength = 0;
	}
	// Send alert that nIR wavelength was updated with a copy of the stored values
	ELMAlerts.info_update.energy.alert(ExcitationLaserManager.stored.copy());
}

function ExcitationLaserManager_update_mode(mode) {
	ExcitationLaserManager.stored.selected_mode = mode;
	// Send alert that nIR mode was updated with a copy of the stored values
	ELMAlerts.info_update.energy.alert(ExcitationLaserManager.stored.copy());
}

function ExcitationLaserManager_process_settings(settings) {
	if (settings?.laser?.excitation) {
		ExcitationLaserManager.params.acceptance_range = settings.laser.excitation.acceptance_range;
		ExcitationLaserManager.params.move_attempts = settings.laser.excitation.move_attempts;
		ExcitationLaserManager.params.wavemeter_channel = settings.laser.excitation.wavemeter_channel;
		ExcitationWavelength.YAG_wl = settings.laser.excitation.yag_fundamental;
	}
	// Also update settings for Excitation Wavemeter Manager and OPO/A
	EWMMessenger.update.process_settings(settings);
	OPOMMessenger.update.process_settings(settings);
}

/****
			Functions involving OPO
****/

/**
 * Move OPO/A to desired IR energy
 * @param {number} desired_energy Desired IR energy in cm-1
 */
async function ExcitationLaserManager_goto_ir(desired_energy) {
	let energy_error, distance;
	let move_attempts = ExcitationLaserManager.params.move_attempts;
	let desired_wavelength = new ExcitationWavelength();
	let converted_measurement = new ExcitationWavelength();
	let desired_mode = desired_wavelength.get_nir({ wavenumber: desired_energy });
	if (!desired_mode) {
		// IR energy is not possible, send error alert
		update_messenger.error(`IR Energy of ${desired_energy}cm-1 is not attainable`);
		return;
	}
	// Update stored IR mode
	ExcitationLaserManager.stored.selected_mode = desired_mode;
	converted_measurement.selected_mode = desired_mode;
	// Alert that a GoTo process has started
	ExcitationLaserManager.goto.status = GoToState.RUNNING;
	ELMAlerts.event.goto.start.alert();
	update_messenger.update(`IR GoTo ${desired_energy.toFixed(3)}cm-1 Started`);
	// Set OPO/A to wavelength mode
	OPOMMessenger.update.wavelength_mode();
	// If the excitation wavemeter channel is not set, then we should move OPO without
	//	automatically measuring wavelength -> should move to desired wavelength in one attempt
	if (ExcitationLaserManager.params.wavemeter_channel === -1) {
		move_attempts = 1;
	}

	// First, measure current wavelength and calculate OPO offset
	// Get internal wavelength of OPO
	let opo_wl = await OPOMMessenger.information.get_wavelength();
	// Next, measure wavelength, giving OPO internal wavelength as the expected result
	ExcitationLaserManager.goto.step = GoToStep.MEASURING;
	let measurement = await EWMMessenger.request.measurement.start(opo_wl);

	let desired_nir; // = desired_wavelength.nIR.wavelength - OPOMMessenger.information.offset;
	for (let i = 0; i < move_attempts; i++) {
		// Check if GoTo was paused or canceled
		while (ExcitationLaserManager.goto.status === GoToState.PAUSED) {
			// Wait for it to be resumed or canceled
			await sleep(100);
		}
		if (ExcitationLaserManager.goto.action.cancel) {
			ExcitationLaserManager.goto.action.cancel = false;
			update_messenger.update("IR GoTo Canceled!");
			ELMAlerts.event.goto.cancel.alert();
			ELMAlerts.event.goto.stop_or_cancel.alert();
			return;
		}

		// Figure out desired nIR wavelength and account for offset
		desired_nir = desired_wavelength.nIR.wavelength - OPOMMessenger.information.offset;

		// Adjust the speed of the OPO based on how far the laser has to move
		// If it's more than 10nm away, have OPO move quickly (3 nm/sec)
		// If it's within 1nm, move slowly (0.05 nm/sec)
		distance = Math.abs(desired_nir - opo_wl);
		if (distance > 10) OPOMMessenger.update.set_speed(3);
		else if (distance < 1) OPOMMessenger.update.set_speed(0.05);
		else OPOMMessenger.update.set_speed(); // Set to default speed (1 nm/sec)

		// Tell OPO to move and wait for it to complete
		ExcitationLaserManager.goto.step = GoToStep.MOVING;
		OPOMMessenger.request.goto(desired_nir);
		console.log(
			"GOTO, desired wavelength: %.3f, offset: %.3f, calculated: %.3f",
			desired_nir,
			OPOMMessenger.information.offset,
			desired_wavelength.nIR.wavelength
		);
		while (OPOMMessenger.information.status.moving) {
			// While waiting for OPO to stop moving, check if GoTo was paused or canceled again
			while (ExcitationLaserManager.goto.status === GoToState.PAUSED) {
				// Wait for it to be resumed or canceled
				await sleep(100);
			}
			if (ExcitationLaserManager.goto.action.cancel) {
				ExcitationLaserManager.goto.action.cancel = false;
				update_messenger.update("IR GoTo Canceled!");
				ELMAlerts.event.goto.cancel.alert();
				ELMAlerts.event.goto.stop_or_cancel.alert();
				return;
			}
			await sleep(100);
		}

		// Once done moving, remeasure wavelength
		ExcitationLaserManager.goto.step = GoToStep.MEASURING;
		// Get internal wavelength of OPO
		opo_wl = await OPOMMessenger.information.get_wavelength();
		// Next, measure wavelength, giving OPO internal wavelength as the expected result
		measurement = await EWMMessenger.request.measurement.start(opo_wl);
		// Calculate energy error - if close enough, stop here
		converted_measurement.nIR.wavelength = measurement.wavelength;
		energy_error = Math.abs(converted_measurement.energy.wavenumber - desired_energy);
		if (energy_error <= ExcitationLaserManager.params.acceptance_range) {
			// Energy is close enough, stop here
			break;
		}
		// If not, try again (assuming more attempts left)
	}

	ExcitationLaserManager.goto.step = GoToStep.NONE;
	ExcitationLaserManager.goto.status = GoToState.STOPPED;
	// Reset OPO speed
	OPOMMessenger.update.set_speed();
	// Alert that GoTo has stopped
	let stored_copy = ExcitationLaserManager.stored.copy();
	ELMAlerts.event.goto.stop.alert(stored_copy);
	ELMAlerts.event.goto.stop_or_cancel.alert();
	update_messenger.update("IR GoTo Completed!");
	return stored_copy;
}

/*****************************************************************************

					EXCITATION LASER MANAGER ALERTS

*****************************************************************************/

const ELMAlerts = {
	event: {
		goto: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
			pause: new ManagerAlert(),
			resume: new ManagerAlert(),
			cancel: new ManagerAlert(),
			stop_or_cancel: new ManagerAlert(),
		},
	},
	info_update: {
		energy: new ManagerAlert(),
		measurement: new ManagerAlert(),
	},
};

/*****************************************************************************

			EXCITATION LASER MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from Excitation Laser Manager */
class ELMMessengerInformation {
	constructor() {
		this._goto = {
			_status: {
				/** Whether GoTo process is currently taking place */
				running: () => {
					return ExcitationLaserManager.goto.status === GoToState.RUNNING;
				},
				/** Whether GoTo process is currently paused */
				paused: () => {
					return ExcitationLaserManager.goto.status === GoToState.PAUSED;
				},
				/** Whether GoTo process is not currently taking place */
				stopped: () => {
					return ExcitationLaserManager.goto.status === GoToState.STOPPED;
				},
			},
			_step: {
				/** Whether wavelength is being measured (during GoTo process) */
				measuring: () => {
					return ExcitationLaserManager.goto.step === GoToStep.MEASURING;
				},
				/** Whether OPO is being moved */
				moving: () => {
					return ExcitationLaserManager.goto.step === GoToStep.MOVING;
				},
			},

			/** Information related to GoTo status (running, paused, or stopped) */
			get status() {
				return this._status;
			},
			/** Information related to GoTo step if running (measuring wavelength or moving OPO) */
			get step() {
				return this._step;
			},
		};
	}

	/**
	 * Get a copy of the stored Excitation Wavelength values
	 * @returns {ExcitationWavelength}
	 */
	get stored_energy() {
		// Return a copy of the stored IR energy values
		return ExcitationLaserManager.stored.copy();
	}

	/**
	 * Get the stored Excitation Mode (nIR, iIR, mIR, or fIR)
	 * @returns {ExcitationMode}
	 */
	get stored_mode() {
		return ExcitationLaserManager.stored.selected_mode;
	}

	/** Information related to GoTo process */
	get goto() {
		return this._goto;
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request Excitation Laser Manager take action */
class ELMMessengerRequest {
	constructor() {
		this._goto = {
			/**
			 * Go to desired energy (async function)
			 * @param {Number} desired_energy Desired IR energy in cm-1
			 * @returns {ExcitationWavelength | void} returns IR energy on success
			 */
			start: async (desired_energy) => {
				let stored_energy = await ExcitationLaserManager.goto_ir(desired_energy);
				return stored_energy;
			},
			/** Pause GoTo */
			pause: () => {
				ExcitationLaserManager.goto.pause();
			},
			/** Resume GoTo if paused */
			resume: () => {
				ExcitationLaserManager.goto.resume();
			},
			/** Cancel GoTo */
			cancel: () => {
				ExcitationLaserManager.goto.cancel();
			},
		};
	}

	/** Take action related to moving excitation energy (i.e. GoTo) */
	get goto() {
		return this._goto;
	}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request Excitation Laser Manager information be updated or changed */
class ELMMessengerUpdate {
	constructor() {}

	/**
	 * Update the stored near-infrared (nIR) wavelength
	 * @param {Number} wavelength (in nm) new nIR wavelength
	 */
	nir_wavelength(wavelength) {
		ExcitationLaserManager.update_nir_wavelength(wavelength);
	}

	/**
	 * Update the stored IR mode (nIR, iIR, mIR, or fIR)
	 * @param {ExcitationMode} mode new IR mode
	 */
	nir_mode(mode) {
		ExcitationLaserManager.update_mode(mode);
	}

	process_settings(settings) {
		ExcitationLaserManager.process_settings(settings);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class ELMMessengerCallback {
	constructor() {
		this._event = new ELMMessengerCallbackEvent();
		this._info_update = new ELMMessengerCallbackInfoUpdate();
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

//event: {
//	goto: {
//		start: new ManagerAlert(),
//		stop: new ManagerAlert(),
//		pause: new ManagerAlert(),
//		resume: new ManagerAlert(),
//		cancel: new ManagerAlert(),
//	},
//},

/** Set up callback functions to be executed when event occurs */
class ELMMessengerCallbackEvent {
	constructor() {
		this._goto = {
			_start: {
				/**
				 * Execute callback function *every time* a GoTo process is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					ELMAlerts.event.goto.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					ELMAlerts.event.goto.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* a GoTo process is stopped
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `wavelength {ExcitationWavelength}`: IR energy after GoTo
				 */
				on: (callback) => {
					ELMAlerts.event.goto.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is stopped
				 * @param {Function} callback function to execute on event -
				 * 		Called with argument `wavelength {ExcitationWavelength}`: IR energy after GoTo
				 */
				once: (callback) => {
					ELMAlerts.event.goto.stop.add_once(callback);
				},
			},
			_pause: {
				/**
				 * Execute callback function *every time* a GoTo process is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					ELMAlerts.event.goto.pause.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					ELMAlerts.event.goto.pause.add_once(callback);
				},
			},
			_resume: {
				/**
				 * Execute callback function *every time* a GoTo process is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					ELMAlerts.event.goto.resume.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					ELMAlerts.event.goto.resume.add_once(callback);
				},
			},
			_cancel: {
				/**
				 * Execute callback function *every time* a GoTo process is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					ELMAlerts.event.goto.cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					ELMAlerts.event.goto.cancel.add_once(callback);
				},
			},
			_stop_or_cancel: {
				/**
				 * Execute callback function *every time* a GoTo process is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					ELMAlerts.event.goto.stop_or_cancel.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a GoTo process is stopped *or* canceled
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					ELMAlerts.event.goto.stop_or_cancel.add_once(callback);
				},
			},

			/** Listen for GoTo process being started */
			get start() {
				return this._start;
			},
			/** Listen for GoTo process being stopped */
			get stop() {
				return this._stop;
			},
			/** Listen for GoTo process being paused */
			get pause() {
				return this._pause;
			},
			/** Listen for GoTo process being resumed */
			get resume() {
				return this._resume;
			},
			/** Listen for GoTo process being canceled */
			get cancel() {
				return this._cancel;
			},
			/** Listen for GoTo process being stopped *or* canceled */
			get stop_or_cancel() {
				return this._stop_or_cancel;
			},
		};
	}

	get goto() {
		return this._goto;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class ELMMessengerCallbackInfoUpdate {
	constructor() {
		this._energy = {
			/**
			 * Execute callback function *every time* excitation energy or mode is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `stored_energy {ExcitationWavelength}`: stored IR energy
			 */
			on: (callback) => {
				ELMAlerts.info_update.energy.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* excitation energy or mode is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `stored_energy {ExcitationWavelength}`: stored IR energy
			 */
			once: (callback) => {
				ELMAlerts.info_update.energy.add_once(callback);
			},
		};

		this._measurement = {
			/**
			 * Execute callback function *every time* excitation wavelength is measured
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `measurement {WavemeterMeasurement}`: measured excitation wavelength
			 */
			on: (callback) => {
				ELMAlerts.info_update.measurement.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* excitation wavelength is measured
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `measurement {WavemeterMeasurement}`: measured excitation wavelength
			 */
			once: (callback) => {
				ELMAlerts.info_update.measurement.add_once(callback);
			},
		};
	}

	get energy() {
		return this._energy;
	}

	get measurement() {
		return this._measurement;
	}
}

/*****************************************************************************

					EXCITATION LASER MANAGER MESSENGER

*****************************************************************************/

class ExcitationLaserManagerMessenger {
	constructor() {
		this._information = new ELMMessengerInformation();
		this._request = new ELMMessengerRequest();
		this._update = new ELMMessengerUpdate();
		this._listen = new ELMMessengerCallback();

		this._wavemeter = new ExcitationWavemeterManagerMessenger();
		this._opo = new OPOManagerMessenger();
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

	get wavemeter() {
		return this._wavemeter;
	}
	get opo() {
		return this._opo;
	}
}

module.exports = { ExcitationLaserManagerMessenger };
