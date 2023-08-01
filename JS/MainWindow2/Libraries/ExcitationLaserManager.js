/************************************************** 

		Control for IR Excitation Laser

**************************************************/

const { ManagerAlert } = require("./ManagerAlert.js");
const { ExcitationWavelength, ExcitationMode } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");
const { ExcitationWavemeterManagerMessenger } = require("./WavemeterManager.js");

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
	},
	update_nir_wavelength: (wavelength) => ExcitationLaserManager_update_nir_wavelength(wavelength),
	update_mode: (mode) => ExcitationLaserManager_update_mode(mode),
	process_settings: (settings) => ExcitationLaserManager_process_settings(settings),
};

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
		ExcitationWavelength.YAG_wl = settings.laser.excitation.yag_fundamental;
	}
	// Also update settings for Excitation Wavemeter Manager
	const EWMMessenger = new ExcitationWavemeterManagerMessenger();
	EWMMessenger.update.process_settings(settings);
}

/*****************************************************************************

						EXCITATION LASER MANAGER

*****************************************************************************/

const ELMAlerts = {
	event: {
		goto: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
			pause: new ManagerAlert(),
			resume: new ManagerAlert(),
			cancel: new ManagerAlert(),
		},
	},
	info_update: {
		energy: new ManagerAlert(),
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
	constructor() {}

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
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request Excitation Laser Manager take action */
class ELMMessengerRequest {
	constructor() {}
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

/** Set up callback functions to be executed when event occurs */
class ELMMessengerCallbackEvent {
	constructor() {}
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
	}

	get energy() {
		return this._energy;
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
		// Listen for updates from the wavemeter
		this.wavemeter.listen.info_update.measurement.on((measurement) => {
			ExcitationLaserManager.update_nir_wavelength(measurement.reduced_stats.average);
		});
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
}

module.exports = { ExcitationLaserManagerMessenger };
