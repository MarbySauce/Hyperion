/************************************************** 

		Control for High Finesse Wavemeter

**************************************************/

const wavemeter = require("bindings")("wavemeter");
const { sleep } = require("./Sleep.js");
const { ManagerAlert } = require("./ManagerAlert.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

// NOTE: Unlike the other managers, the Wavemeter Manager is actually a class
// and Excitation and Detachment Wavemeter Managers are static instances of that class

class WavemeterState {
	/** Wavelength is currently being measured */
	static RUNNING = new WavemeterState();
	/** Wavelength measurement is paused */
	static PAUSED = new WavemeterState();
	/** Wavelength is not being measured */
	static STOPPED = new WavemeterState();
}

class WavemeterManager {
	static Detachment = new WavemeterManager("Detachment");
	static Excitation = new WavemeterManager("Excitation");

	constructor(name) {
		this.name = name;

		this.status = WavemeterState.STOPPED;

		this.measurement = new WavemeterMeasurement();

		this.pause = false;
		this.cancel = false;

		this.params = {
			channel: -1, // Which wavemeter channel to measure
			wavelength_range: 1, // nm, how close the measured value needs to be to the expected wavelength
			collection_length: 50,
			max_fail_count: 50,
			max_bad_measurements: 100,
		};

		this.WMAlerts = {
			event: {
				measurement: {
					start: new ManagerAlert(),
					stop: new ManagerAlert(),
					pause: new ManagerAlert(),
					resume: new ManagerAlert(),
				},
			},
			info_update: {
				measurement: new ManagerAlert(),
			},
		};
	}

	pause_measurement() {
		if (this.status !== WavemeterState.RUNNING) return;
		this.pause = true;
		this.status = WavemeterState.PAUSED;
		this.alert_pause();
	}

	resume_measurement() {
		if (this.status !== WavemeterState.PAUSED) return;
		this.pause = false;
		this.status = WavemeterState.RUNNING;
		this.alert_resume();
	}

	cancel_measurement() {
		if (this.status !== WavemeterState.RUNNING) return;
		this.cancel = true;
	}

	alert_start() {
		this.status = WavemeterState.RUNNING;
		this.WMAlerts.event.measurement.start.alert();
	}

	alert_stop() {
		this.status = WavemeterState.STOPPED;
		this.cancel = false;
		this.pause = false;
		this.WMAlerts.event.measurement.stop.alert(this.measurement.copy());
	}

	alert_pause() {
		this.WMAlerts.event.measurement.pause.alert();
	}

	alert_resume() {
		this.WMAlerts.event.measurement.resume.alert();
	}

	async measure(expected_wavelength) {
		let channel = this.params.channel;
		let wavelength_range = this.params.wavelength_range;
		let collection_length = this.params.collection_length;
		let max_fail_count = this.params.max_fail_count;
		let max_bad_measurements = this.params.max_bad_measurements;
		let measurement = new WavemeterMeasurement();
		let wavelength;

		if (channel === -1) {
			// No wavemeter channel saved for the excitation laser, cancel
			update_messenger.error(`No wavemeter channel selected for ${this.name}`);
			this.alert_stop();
			return measurement;
		}

		// Send alert that wavelength measurement has started
		this.alert_start();

		let fail_count = 0;
		let bad_measurement_count = 0;

		wavemeter.startMeasurement();
		while (measurement.wavelength_values.length < collection_length) {
			// Wait for next laser pulse (100ms / 10Hz)
			await sleep(100);
			if (this.cancel) {
				wavemeter.stopMeasurement();
				update_messenger.update(`${this.name} measurement canceled!`);
				this.alert_stop();
				return measurement;
			}
			// If measurement is paused, stay in loop until it's resumed
			if (this.pause) {
				continue;
			}
			// Check if there were too many failed measurements
			if (fail_count > max_fail_count) {
				// Stop measurement
				wavemeter.stopMeasurement();
				this.alert_stop();
				update_messenger.error(`${this.name} wavelength measurement had ${fail_count} failed measurements - canceled`);
				return measurement;
			}
			// Check if there were too many bad measurements
			if (bad_measurement_count > max_bad_measurements) {
				// Stop measurement
				wavemeter.stopMeasurement();
				this.alert_stop();
				update_messenger.error(`${this.name} wavelength measurement had ${bad_measurement_count} bad measurements - canceled`);
				return measurement;
			}
			wavelength = wavemeter.getWavelength(channel);
			// Make sure a wavelength was returned
			if (wavelength <= 0) {
				fail_count++;
				continue;
			}
			// If expected wavelength was given, make sure measured wavelength is within range
			if (expected_wavelength && Math.abs(wavelength - expected_wavelength) > wavelength_range) {
				bad_measurement_count++;
				continue;
			}
			// Record wavelength
			measurement.add(wavelength);
		}
		// Stop wavemeter measurement
		wavemeter.stopMeasurement();
		// Send alert that wavelength measurement has stopped
		this.alert_stop();
		// Calculate (reduced) average wavelength and update
		measurement.get_average();
		this.measurement = measurement.copy();
		return measurement;
	}

	/*async measure(expected_wavelength) {
		console.log("Measuring wavelength!", this.name);
	}*/

	process_settings(settings) {
		if (settings?.wavemeter) {
			this.params.collection_length = settings.wavemeter.collection_length;
			this.params.max_bad_measurements = settings.wavemeter.max_bad_measurements;
			this.params.max_fail_count = settings.wavemeter.max_fail_count;
		}

		// This is a gross way to do it but it works so whatever
		let type = this.name.toLowerCase(); // e.g. "Excitation" -> "excitation"
		if (settings?.laser[type]?.wavemeter_channel) {
			this.params.channel = settings.laser[type].wavemeter_channel; // Only works for Excitation and Detachment static instances
		}
	}
}

/*****************************************************************************

					WAVEMETER MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from Wavemeter Manager */
class WMMessengerInformation {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;

		this._status = {
			/** Whether a wavelength measurement is being taken */
			get running() {
				return this._WMManager.status === WavemeterState.RUNNING;
			},
			/** Whether a wavelength measurement is paused */
			get paused() {
				return this._WMManager.status === WavemeterState.PAUSED;
			},
			/** Whether a wavelength measurement is not being taken */
			get stopped() {
				return this._WMManager.status === WavemeterState.STOPPED;
			},
		};
	}

	/** Status of Wavemeter Manager */
	get status() {
		return this._status;
	}

	/** Copy of most recent wavelength measurement */
	get measurement() {
		return this._WMManager.measurement.copy();
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request Wavemeter Manager take action */
class WMMessengerRequest {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;

		this._measurement = {
			/**
			 * Start measuring the wavelength
			 * @param {Number} expected_wavelength (in nm) wavelength you expect to be measuring (optional)
			 * @returns {WavemeterMeasurement} measured wavelength
			 */
			start: async (expected_wavelength) => {
				return this._WMManager.measure(expected_wavelength);
			},
			/**
			 * Pause current wavelength measurement
			 */
			pause: () => {
				this._WMManager.pause_measurement();
			},
			/**
			 * Resume wavelength measurement if paused
			 */
			resume: () => {
				this._WMManager.resume_measurement();
			},
			/**
			 * Cancel current wavelength measurement
			 */
			cancel: () => {
				this._WMManager.cancel_measurement();
			},
		};
	}

	/** Take action related to wavelength measurement */
	get measurement() {
		return this._measurement;
	}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request Image Manager information be updated or changed */
class WMMessengerUpdate {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;
	}

	process_settings(settings) {
		this._WMManager.process_settings(settings);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class WMMessengerCallback {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;

		this._event = new WMMessengerCallbackEvent(wavemeter_manager);
		this._info_update = new WMMessengerCallbackInfoUpdate(wavemeter_manager);
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
class WMMessengerCallbackEvent {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;

		this._measurement = {
			_start: {
				/**
				 * Execute callback function *every time* a wavelength measurement is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					this._WMManager.WMAlerts.event.measurement.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a wavelength measurement is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					this._WMManager.WMAlerts.event.measurement.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* a wavelength measurement is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					this._WMManager.WMAlerts.event.measurement.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a wavelength measurement is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					this._WMManager.WMAlerts.event.measurement.stop.add_once(callback);
				},
			},
			_pause: {
				/**
				 * Execute callback function *every time* a wavelength measurement is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					this._WMManager.WMAlerts.event.measurement.pause.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a wavelength measurement is paused
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					this._WMManager.WMAlerts.event.measurement.pause.add_once(callback);
				},
			},
			_resume: {
				/**
				 * Execute callback function *every time* a wavelength measurement is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					this._WMManager.WMAlerts.event.measurement.resume.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* a wavelength measurement is resumed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					this._WMManager.WMAlerts.event.measurement.resume.add_once(callback);
				},
			},

			/** Listen for wavelength measurement being started */
			get start() {
				return this._start;
			},
			/** Listen for wavelength measurement being stopped (and saved) */
			get stop() {
				return this._stop;
			},
			/** Listen for wavelength measurement being paused */
			get pause() {
				return this._pause;
			},
			/** Listen for wavelength measurement being resumed */
			get resume() {
				return this._resume;
			},
		};
	}

	/** Set up callback functions to be executed when wavelength measurement event occurs  */
	get measurement() {
		return this._measurement;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class WMMessengerCallbackInfoUpdate {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._WMManager = wavemeter_manager;

		this._measurement = {
			/**
			 * Execute callback function *every time* measured wavelength is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `measurement {WavelengthMeasurement}`: measured wavelength
			 */
			on: (callback) => {
				this._WMManager.WMAlerts.info_update.measurement.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* measured wavelength is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `measurement {WavelengthMeasurement}`: measured wavelength
			 */
			once: (callback) => {
				this._WMManager.WMAlerts.info_update.measurement.add_once(callback);
			},
		};
	}

	/** Set up callback functions to be executed when wavelength measurement is updated  */
	get measurement() {
		return this._measurement;
	}
}

/*****************************************************************************

						WAVELENGTH MANAGER MESSENGERS

*****************************************************************************/

class WavemeterManagerMessenger {
	/** @param {WavemeterManager} wavemeter_manager */
	constructor(wavemeter_manager) {
		this._information = new WMMessengerInformation(wavemeter_manager);
		this._request = new WMMessengerRequest(wavemeter_manager);
		this._update = new WMMessengerUpdate(wavemeter_manager);
		this._listen = new WMMessengerCallback(wavemeter_manager);
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

class ExcitationWavemeterManagerMessenger extends WavemeterManagerMessenger {
	constructor() {
		super(WavemeterManager.Excitation);
	}
}

class DetachmentWavemeterManagerMessenger extends WavemeterManagerMessenger {
	constructor() {
		super(WavemeterManager.Detachment);
	}
}

module.exports = { ExcitationWavemeterManagerMessenger, DetachmentWavemeterManagerMessenger };
