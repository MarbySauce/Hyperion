/************************************************** 

		Control for Detachment Laser

**************************************************/

const { ManagerAlert } = require("./ManagerAlert.js");
const { DetachmentWavelength, DetachmentMode } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");
const { DetachmentWavemeterManagerMessenger } = require("./WavemeterManager.js");

/*****************************************************************************

						DETACHMENT LASER MANAGER

*****************************************************************************/

const DetachmentLaserManager = {
	stored: new DetachmentWavelength(),
	update_standard_wavelength: (wavelength) => DetachmentLaserManager_update_standard_wavelength(wavelength),
	update_mode: (mode) => DetachmentLaserManager_update_mode(mode),
	process_settings: (settings) => DetachmentLaserManager_process_settings(settings),
};

/****
		Functions
****/

function DetachmentLaserManager_update_standard_wavelength(wavelength) {
	if (wavelength) {
		DetachmentLaserManager.stored.standard.wavelength = wavelength;
	} else {
		DetachmentLaserManager.stored.standard.wavelength = 0;
	}
	// Send alert that standard wavelength was updated with a copy of the stored values
	DLMAlerts.info_update.energy.alert(DetachmentLaserManager.stored.copy());
}

function DetachmentLaserManager_update_mode(mode) {
	DetachmentLaserManager.stored.selected_mode = mode;
	// Send alert that standard mode was updated with a copy of the stored values
	DLMAlerts.info_update.energy.alert(DetachmentLaserManager.stored.copy());
}

function DetachmentLaserManager_process_settings(settings) {
	if (settings?.laser?.detachment) {
		DetachmentWavelength.YAG_wl = settings.laser.detachment.yag_fundamental;
	}
	// Also update settings for Detachment Wavemeter Manager
	const DWMMessenger = new DetachmentWavemeterManagerMessenger();
	DWMMessenger.update.process_settings(settings);
}

/*****************************************************************************

						DETACHMENT LASER MANAGER

*****************************************************************************/

const DLMAlerts = {
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

			DETACHMENT LASER MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from Detachment Laser Manager */
class DLMMessengerInformation {
	constructor() {}

	/**
	 * Get a copy of the stored Detachment Wavelength values
	 * @returns {DetachmentWavelength}
	 */
	get stored_energy() {
		// Return a copy of the stored IR energy values
		return DetachmentLaserManager.stored.copy();
	}

	/**
	 * Get the stored Detachment Mode (standard, doubled, raman, or irdfg)
	 * @returns {DetachmentMode}
	 */
	get stored_mode() {
		return DetachmentLaserManager.stored.selected_mode;
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request Detachment Laser Manager take action */
class DLMMessengerRequest {
	constructor() {}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request Detachment Laser Manager information be updated or changed */
class DLMMessengerUpdate {
	constructor() {}

	/**
	 * Update the stored near-infrared (standard) wavelength
	 * @param {Number} wavelength (in nm) new standard wavelength
	 */
	standard_wavelength(wavelength) {
		DetachmentLaserManager.update_standard_wavelength(wavelength);
	}

	/**
	 * Update the stored IR mode (standard, doubled, raman, or irdfg)
	 * @param {DetachmentMode} mode new IR mode
	 */
	standard_mode(mode) {
		DetachmentLaserManager.update_mode(mode);
	}

	process_settings(settings) {
		DetachmentLaserManager.process_settings(settings);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class DLMMessengerCallback {
	constructor() {
		this._event = new DLMMessengerCallbackEvent();
		this._info_update = new DLMMessengerCallbackInfoUpdate();
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
class DLMMessengerCallbackEvent {
	constructor() {}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class DLMMessengerCallbackInfoUpdate {
	constructor() {
		this._energy = {
			/**
			 * Execute callback function *every time* Detachment energy or mode is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `stored_energy {DetachmentWavelength}`: stored detachment energy
			 */
			on: (callback) => {
				DLMAlerts.info_update.energy.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* Detachment energy or mode is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `stored_energy {DetachmentWavelength}`: stored detachment energy
			 */
			once: (callback) => {
				DLMAlerts.info_update.energy.add_once(callback);
			},
		};
	}

	get energy() {
		return this._energy;
	}
}

/*****************************************************************************

					DETACHMENT LASER MANAGER MESSENGER

*****************************************************************************/

class DetachmentLaserManagerMessenger {
	constructor() {
		this._information = new DLMMessengerInformation();
		this._request = new DLMMessengerRequest();
		this._update = new DLMMessengerUpdate();
		this._listen = new DLMMessengerCallback();

		this._wavemeter = new DetachmentWavemeterManagerMessenger();
		// Listen for updates from the wavemeter
		this.wavemeter.listen.info_update.measurement.on((measurement) => {
			DetachmentLaserManager.update_standard_wavelength(measurement.reduced_stats.average);
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

module.exports = { DetachmentLaserManagerMessenger };
