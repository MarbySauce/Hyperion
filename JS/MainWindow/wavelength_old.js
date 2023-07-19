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

// NOTE FOR MARTY: This is probably a bad way to set it up. For instance, when moving OPO,
// we will likely want to measure the wavelength 2-3x, but we only want to update
// the wavelength on the final measurement
//
// Likely need 2 different measurement calls

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

async function measure_wavelength(
	channel,
	expected_wavelength,
	wavelength_range = 1,
	collection_length = 50,
	max_fail_count = 50,
	max_bad_measurements = 100
) {
	let measurement = new WavemeterMeasurement();

	if (channel === -1) {
		// No wavemeter channel saved for the detachment laser, cancel
		msgEmitter.emit(MSG.ERROR, "No wavemeter channel selected - canceling measurement");
		return measurement;
	}

	let fail_count = 0;
	let bad_measurement_count = 0;

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
		if (expected_wavelength && Math.abs(wavelength - expected_wavelength) > wavelength_range) {
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
	return measurement;
}

// Returned value of -6 means that channel is not available
async function WavemeterManager_detachment_measure() {
	let channel = settings.laser.detachment.wavemeter_channel;
	let expected_wl = WavemeterManager.detachment.expected_wavelength;
	let wavelength_range = WavemeterManager.params.wavelength_range;
	let collection_length = settings.wavemeter.collection_length;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;

	let measurement = await measure_wavelength(channel, expected_wl, wavelength_range, collection_length, max_fail_count, max_bad_measurements);

	WavemeterManager.detachment.measurement = measurement;
}

async function WavemeterManager_excitation_measure() {
	let channel = settings.laser.excitation.wavemeter_channel;
	let expected_wl = WavemeterManager.excitation.expected_wavelength;
	let wavelength_range = WavemeterManager.params.wavelength_range;
	let collection_length = settings.wavemeter.collection_length;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;

	let measurement = await measure_wavelength(channel, expected_wl, wavelength_range, collection_length, max_fail_count, max_bad_measurements);

	WavemeterManager.excitation.measurement = measurement;
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

/*****************************************************************************

								OPO/A MANAGER

*****************************************************************************/

const opo = {
	network: {
		client: new net.Socket(),
		config: {
			host: "localhost",
			port: 1315,
		},
		command: {
			get_wavelength: "TELLWL",
			get_motor_status: "TELLSTAT",
			set_speed: (val) => {
				// val should be speed in nm/sec
				return `SETSPD ${val.toFixed(4)}`;
			},
			move: (val) => {
				// val should be nIR wavelength in nm
				return `GOTO ${val.toFixed(3)}`;
			},
		},
		/**
		 * Establish connection with OPO/A
		 */
		connect: () => {
			if (opo.status.connected) {
				return;
			}
			opo.network.client.connect(opo.network.config, (error) => {
				if (error) {
					// Send error alert
					msgEmitter.emit(MSG.ERROR, "Could not connect to OPO! - Error logged to console");
					console.log(`Could not connect to OPO: ${error}`);
				} else {
					opo.status.connected = true;
				}
			});
		},
		/**
		 * Close connection with OPO/A
		 */
		close: () => {
			opo.network.client.end();
			opo.status.connected = false;
		},
	},
	status: {
		connected: false,
		motors_moving: false,
		current_wavelength: 0,
	},
	params: {
		lower_wl_bound: 710,
		upper_wl_bound: 880,
	},
	/**
	 * Get the nIR wavelength recorded by the OPO
	 */
	get_wavelength: () => {
		opo.network.client.write(opo.network.command.get_wl, () => {});
	},
	/**
	 * Update the wavelength stored in opo object
	 * @param {number} wavelength - nIR wavelength (nm)
	 */
	update_wavelength: (wavelength) => opo_update_wavelength(wavelength),
	/**
	 * Get status of OPO motors
	 */
	get_motor_status: () => {
		opo.network.client.write(opo.network.command.get_motor_status, () => {});
	},
	/**
	 * Move OPO to specific nIR wavelength
	 * @param {number} nir_wavelength - nIR wavelength (nm)
	 */
	goto_nir: (nir_wavelength) => opo_goto_nir(nir_wavelength),
	/**
	 * Set OPO/A motor speed
	 * @param {number} val Motor speed in nm/sec
	 */
	set_speed: (val) => {
		opo.network.client.write(opo.network.command.set_speed(val), () => {});
	},
	/**
	 * Parse error returned by OPO
	 * @param {number} error_code - code returned by OPO
	 */
	parse_error: (error_code) => {
		if (!error_code) {
			// No error code or error_code === 0 => Successfully executed command
			return;
		}
		const opo_errors = [
			"Successfully Executed Command",
			"Invalid Command",
			"Required Window Not Open",
			"Specified Value Is Out Of Range",
			"Specified Velocity Is Out Of Safe Values",
			"A GoTo Operation Is Already Active",
			"Unable To Change Settings While Motor Movement Active",
			"No USB Voltmeter Detected",
		];
		// Send error alert
		msgEmitter.emit(MSG.ERROR, `OPO Error #${error_code}: ${opo_errors[error_code]}`);
	},
};

/****
		OPO client listeners
****/

// Receive message from OPO computer
opo.network.client.on("data", (data) => {
	// Convert to string
	data = data.toString();
	// Split data up (in case two things came at the same time)
	data = data.split("\r\n");
	// Process message(s)
	data.forEach((msg) => {
		if (msg) {
			process_opo_data(msg);
		}
	});
});

// Receive error message (e.g. cannot connect to server)
opo.network.client.on("error", (error) => {
	msgEmitter.emit(MSG.ERROR, "OPO Connection error!");
	console.log(`OPO Connection ${error}`);
	opo.status.connected = false;
});

/****
		OPO Event listeners
****/

opoEmitter.on(OPO.QUERY.WAVELENGTH, () => {
	opo.get_wavelength();
});

/****
		Functions
****/

function opo_startup() {
	// Update OPO settings
	if (settings) {
		opo.network.config.host = settings.opo.host;
		opo.network.config.port = settings.opo.port;
	}

	opo.network.connect();
}

function process_opo_data(data) {
	// Get rid of newline character "/r/n"
	data = data.replace("\r\n", "");
	// Filter motor movement results, which are hexadecimal numbers
	if (data.startsWith("0x")) {
		// Note: Don't use triple equals here
		if (data == 0) {
			// Motors are done moving
			opo.status.motors_moving = false;
			return;
		}
		// Motors are still moving
		opo.status.motors_moving = true;
		return;
	}
	// Make sure it is a number (not an unexpected result)
	if (isNaN(data)) {
		console.log("Message from OPO:", data);
		return;
	}
	// Convert data to number
	data = parseFloat(data);
	// Check if it's an error code
	if (data < 10) {
		opo.parse_error(data);
		return;
	}
	// Only remaining option is it's the OPO's wavelength
	opo.update_wavelength(data);
}

function opo_update_wavelength(wavelength) {
	opo.status.current_wavelength = wavelength;
	opoEmitter.emit(OPO.RESPONSE.WAVELENGTH, wavelength);
}

// Tell OPO to move to nIR wavelength
function opo_goto_nir(nir_wavelength) {
	opo.status.motors_moving = true;
	opo.network.client.write(opo.network.command.move(nir_wavelength), () => {});
	wait_for_opo_motors();
}

// Async function that resolves when the OPO motors have stopped moving
async function wait_for_opo_motors() {
	// Check if motors are moving every 250ms
	while (opo.status.motors_moving) {
		opo.get_motor_status();
		await sleep(250);
	}
	// Send alert that motors have stopped
	opoEmitter.emit(OPO.ALERT.MOTORS.STOPPED);
	return true;
}

/*****************************************************************************

						EXCITATION LASER CONTROL MANAGER

*****************************************************************************/

// Params needed
// 	- Number of attempts to make
//	- Last OPO offset

const ExcitationLaserManager = {
	last_offset: 0,
	params: {
		move_attempts: 2,
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

// GoTo IR Energy requested
// IR_energy should be a number corresponding to the desired IR energy in wavenumbers (cm-1)
laserEmitter.on(LASER.GOTO.EXCITATION, async (IR_energy) => {
	let desired_wavelength = new ExcitationWavelength();
	let desired_mode = desired_wavelength.get_nir({ wavenumber: IR_energy });
	if (!desired_mode) {
		// IR energy is not possible, send error alert
		msgEmitter.emit(MSG.ERROR, `IR Energy of ${IR_energy}cm-1 is not attainable`);
		let converted_values = { mode: undefined, input: 0, wavelength: 0, wavenumber: 0 };
		laserEmitter.emit(LASER.RESPONSE.EXCITATION.INFO, converted_values);
		return;
	}
	// ELSE: Go to nIR wavelength and measure
	await sleep(2000);
	let energy = desired_wavelength.get_energy(desired_mode);
	let converted_values = {
		mode: desired_mode,
		input: desired_wavelength.nIR.wavelength,
		wavelength: energy.wavelength,
		wavenumber: energy.wavenumber,
	};
	laserEmitter.emit(LASER.RESPONSE.EXCITATION.INFO, converted_values);
});

/****
		Functions
****/

async function measure_opo_wavelength() {
	let channel = settings.laser.excitation.wavemeter_channel;
	let wavelength_range = WavemeterManager.params.wavelength_range;
	let collection_length = settings.wavemeter.collection_length;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;

	// Request current wavelength from OPO
	opo.get_wavelength();
	await once(opoEmitter, OPO.RESPONSE.WAVELENGTH);
	let opo_wavelength = opo.status.current_wavelength;
	// Measure wavelength
	let measurement = await measure_wavelength(channel, opo_wavelength, wavelength_range, collection_length, max_fail_count, max_bad_measurements);
	// Record laser wavelength and last laser offset in measurement object
	measurement.laser_wavelength = opo_wavelength;
	measurement.last_offset = ExcitationLaserManager.last_offset;
	// If the returned wavelength is not 0, update last_offset
	if (measurement.wavelength) ExcitationLaserManager.last_offset = measurement.laser_offset;
	// (This way, if the measurement was bad we might be able to work out what the actual wavelength was)
	return measurement;
}

async function move_opo_wavelength(desired_nir) {}
