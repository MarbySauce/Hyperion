/************************************************** 

	Wavelength (and Wavemeter) Logic/Control

**************************************************/

const { DetachmentWavelength, ExcitationWavelength } = require("../JS/MainWindow/wavelengthClasses.js");
const { WavemeterMeasurement } = require("../JS/MainWindow/wavemeterClasses.js");

// Required functionality:

// (Not dealing with wavemeter)
// - Convert laser energies
//		- Dye light (Standard, Doubled, Raman, IRDFG)
//		- IR light (nIR, iIR, mIR, fIR)
//		- nm <-> cm-1
//		- nIR <-> {iIR, mIR, fIR} conversion

// (Dealing with wavemeter)
// - Measure wavelengths
//		- (Reduced) averaging
// - Decide how long to measure for if things aren't going well (overexposed, etc)

// What to do if the wavelength wasn't read:
//	- You could keep track of the difference between the OPO and the true value
//		then use the adjusted OPO's value
//	- Just say it's all 0
//	-

/*****************************************************************************

							SIMPLE WAVELENGTH MANAGER

*****************************************************************************/

// Manages wavelength/wavenumber conversion for user inputted values
// This does not manage wavemeter or OPO

// stored is for what laser energy the user would like to store (e.g. the laser energy being used)
// conversion is for the unit conversion section
const WavelengthManager = {
	detachment: {
		mode: LASER.MODE.DETACHMENT.STANDARD,
		stored: new DetachmentWavelength(),
		conversion: new DetachmentWavelength(),
		send_stored_info: () => WavelengthManager_detachment_send_stored_info(),
	},
	excitation: {
		mode: LASER.MODE.EXCITATION.NIR,
		stored: new ExcitationWavelength(),
		conversion: new ExcitationWavelength(),
		send_stored_info: () => WavelengthManager_excitation_send_stored_info(),
	},
};

/****
		Laser Event Listeners
****/

laserEmitter.on(LASER.UPDATE.DETACHMENT.MODE, (mode) => {
	WavelengthManager.detachment.mode = mode;
	WavelengthManager.detachment.send_stored_info();
});

laserEmitter.on(LASER.UPDATE.EXCITATION.MODE, (mode) => {
	WavelengthManager.excitation.mode = mode;
	WavelengthManager.excitation.send_stored_info();
});

laserEmitter.on(LASER.UPDATE.DETACHMENT.STANDARDWL, (wavelength) => {
	if (wavelength) {
		WavelengthManager.detachment.stored.standard.wavelength = wavelength;
	} else {
		WavelengthManager.detachment.stored.standard.wavelength = 0;
	}
	// Send back converted values
	WavelengthManager.detachment.send_stored_info();
});

laserEmitter.on(LASER.UPDATE.EXCITATION.NIRWL, (wavelength) => {
	if (wavelength) {
		WavelengthManager.excitation.stored.nIR.wavelength = wavelength;
	} else {
		WavelengthManager.excitation.stored.nIR.wavelength = 0;
	}
	// Send back converted values
	WavelengthManager.excitation.send_stored_info();
});

/****
		Functions
****/

function WavelengthManager_detachment_send_stored_info() {
	let energy = WavelengthManager.detachment.stored.get_energy(WavelengthManager.detachment.mode);
	let input_energy = WavelengthManager.detachment.stored.get_energy(LASER.MODE.DETACHMENT.STANDARD);
	let converted_values = {
		mode: WavelengthManager.detachment.mode,
		input: input_energy.wavelength,
		wavelength: energy.wavelength,
		wavenumber: energy.wavenumber,
	};
	laserEmitter.emit(LASER.RESPONSE.DETACHMENT.INFO, converted_values);
}

function WavelengthManager_excitation_send_stored_info() {
	let energy = WavelengthManager.excitation.stored.get_energy(WavelengthManager.excitation.mode);
	let input_energy = WavelengthManager.excitation.stored.get_energy(LASER.MODE.EXCITATION.NIR);
	let converted_values = {
		mode: WavelengthManager.excitation.mode,
		input: input_energy.wavelength,
		wavelength: energy.wavelength,
		wavenumber: energy.wavenumber,
	};
	laserEmitter.emit(LASER.RESPONSE.EXCITATION.INFO, converted_values);
}

/*****************************************************************************

								WAVEMETER MANAGER

*****************************************************************************/

const WavemeterManager = {
	detachment: {
		measurement: new WavemeterMeasurement(),
		expected_wavelength: undefined,
		measure: async () => WavemeterManager_detachment_measure(),
	},
	excitation: {
		measurement: new WavemeterMeasurement(),
		expected_wavelength: undefined,
		measure: async () => WavemeterManager_excitation_measure(),
	},
	params: {
		cancel: false, // whether to cancel the measurement
		wavelength_range: 1, // nm, how close the measured value needs to be to the expected wavelength
	},
};

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

/****
		Laser Event Listeners
****/

laserEmitter.on(LASER.MEASURE.DETACHMENT, async () => {
	await WavemeterManager.detachment.measure();
	laserEmitter.emit(LASER.UPDATE.DETACHMENT.STANDARDWL, WavemeterManager.detachment.measurement.wavelength);
});

laserEmitter.on(LASER.MEASURE.EXCITATION, async () => {
	await WavemeterManager.excitation.measure();
	laserEmitter.emit(LASER.UPDATE.EXCITATION.NIRWL, WavemeterManager.excitation.measurement.wavelength);
});

/****
		Functions
****/

// Returned value of -6 means that channel is not available
async function WavemeterManager_detachment_measure() {
	if (settings.laser.detachment.wavemeter_channel === -1) {
		// No wavemeter channel saved for the detachment laser, cancel
		msgEmitter.emit(MSG.ERROR, "No wavemeter channel selected for detachment - canceling measurement");
		return;
	}

	// Start a new wavemeter measurement
	let measurement = new WavemeterMeasurement();
	// Start a measurement on wavemeter software
	wavemeter.startMeasurement();

	let channel = settings.laser.detachment.wavemeter_channel;
	let expected_wl = WavemeterManager.detachment.expected_wavelength;
	let wavelength_range = WavemeterManager.params.wavelength_range;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;
	let collection_length = settings.wavemeter.collection_length;
	let fail_count = 0;
	let bad_measurement_count = 0;
	let wavelength;

	while (measurement.wavelength_values.length < collection_length) {
		if (WavemeterManager.params.cancel) {
			WavemeterManager.params.cancel = false;
			return;
		}
		wavelength = wavemeter.getWavelength(channel);
		// Make sure a wavelength was returned
		if (wavelength <= 0) {
			fail_count++;
			continue;
		}
		// If expected wavelength was given, make sure measured wavelength is within range
		if (expected_wl && Math.abs(wavelength - expected_wl) > wavelength_range) {
			bad_measurement_count++;
			continue;
		}
		// Check if there were too many failed measurements
		if (fail_count > max_fail_count) {
			// Stop measurement
			wavemeter.stopMeasurement();
			msgEmitter.emit(MSG.ERROR, `Detachment wavelength measurement had ${fail_count} failed measurements - canceled`);
			return;
		}
		// Check if there were too many bad measurements
		if (bad_measurement_count > max_bad_measurements) {
			// Stop measurement
			wavemeter.stopMeasurement();
			msgEmitter.emit(MSG.ERROR, `Detachment wavelength measurement had ${bad_measurement_count} bad measurements - canceled`);
			return;
		}
		// Record wavelength
		measurement.add(wavelength);
		// Wait for next laser pulse (50ms / 20Hz)
		await sleep(50);
	}
	// Stop wavemeter measurement
	wavemeter.stopMeasurement();
	// Calculate (reduced) average wavelength and update
	measurement.get_average();
	WavemeterManager.detachment.measurement = measurement;
}

async function WavemeterManager_excitation_measure() {
	if (settings.laser.excitation.wavemeter_channel === -1) {
		// No wavemeter channel saved for the excitation laser, cancel
		msgEmitter.emit(MSG.ERROR, "No wavemeter channel selected for excitation - canceling measurement");
		return;
	}

	// Start a new wavemeter measurement
	let measurement = new WavemeterMeasurement();
	// Start a measurement on wavemeter software
	wavemeter.startMeasurement();

	let channel = settings.laser.excitation.wavemeter_channel;
	let expected_wl = WavemeterManager.excitation.expected_wavelength;
	let wavelength_range = WavemeterManager.params.wavelength_range;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;
	let collection_length = settings.wavemeter.collection_length;
	let fail_count = 0;
	let bad_measurement_count = 0;
	let wavelength;

	while (measurement.wavelength_values.length < collection_length) {
		if (WavemeterManager.params.cancel) {
			WavemeterManager.params.cancel = false;
			return;
		}
		wavelength = wavemeter.getWavelength(channel);
		// Make sure a wavelength was returned
		if (wavelength <= 0) {
			fail_count++;
			continue;
		}
		// If expected wavelength was given, make sure measured wavelength is within range
		if (expected_wl && Math.abs(wavelength - expected_wl) > wavelength_range) {
			bad_measurement_count++;
			continue;
		}
		// Check if there were too many failed measurements
		if (fail_count > max_fail_count) {
			// Stop measurement
			wavemeter.stopMeasurement();
			msgEmitter.emit(MSG.ERROR, `Excitation wavelength measurement had ${fail_count} failed measurements - canceled`);
			return;
		}
		// Check if there were too many bad measurements
		if (bad_measurement_count > max_bad_measurements) {
			// Stop measurement
			wavemeter.stopMeasurement();
			msgEmitter.emit(MSG.ERROR, `Excitation wavelength measurement had ${bad_measurement_count} bad measurements - canceled`);
			return;
		}
		// Record wavelength
		measurement.add(wavelength);
		// Wait for next laser pulse (50ms / 20Hz)
		await sleep(50);
	}
	// Stop wavemeter measurement
	wavemeter.stopMeasurement();
	// Calculate (reduced) average wavelength and update
	measurement.get_average();
	WavemeterManager.excitation.measurement = measurement;
}

function wavemeter_startup() {
	// Start wavemeter application
	wavemeter.startApplication();
	wavemeter.setReturnModeNew();

	// Set up Mac wavemeter simulation function
	initialize_mac_fn();
}

/* Functions for simulating wavemeter on Mac */

/**
 * This function is called solely from C++ file (wavemeter_mac.cc)
 * 	to simulate the wavemeter
 * Return a wavelength close to OPO's wavelength
 */
function mac_wavelength(channel) {
	if (channel === settings.laser.detachment.wavemeter_channel) {
		// Just send 650nm (with some noise) as the detachment laser wavelength
		return 650 + norm_rand(0, 0.001);
	} else if (channel === settings.laser.excitation.wavemeter_channel) {
		// Send wavelength as the OPO's wavelength with some noise added
		let wl = 750; //opo.status.current_wavelength;
		// Add some noise
		wl += norm_rand(0, 0.5);
		// Small chance of wavelength being very far off
		if (Math.random() < 0.1) {
			wl -= 20;
		}
		return wl;
	} else {
		return -6; // Wavemeter's error for channel not available
	}
}

/**
 * Initialize JS function on C++ side
 */
function initialize_mac_fn() {
	wavemeter.setUpFunction(mac_wavelength);
}

/**
 * Random number with normal distribution
 * @param {Number} mu - center of normal distribution (mean)
 * @param {Number} sigma - width of normal distribution (sqrt(variance))
 * @returns {Number} random number
 */
function norm_rand(mu, sigma) {
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();
	return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) + mu;
}
