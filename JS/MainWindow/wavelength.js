/************************************************** 

	Wavelength (and Wavemeter) Logic/Control

**************************************************/

const { DetachmentWavelength, ExcitationWavelength } = require("../JS/MainWindow/wavelengthClasses.js");
const { WavemeterMeasurement } = require("../JS/MainWindow/wavemeterClasses.js");

/*****************************************************************************

						EXCITATION LASER MANAGER

*****************************************************************************/

const ExcitationLaserManager = {
	stored: new ExcitationWavelength(),
	conversion: new ExcitationWavelength(),
	measurement: new WavemeterMeasurement(),
	last_offset: 0,
	cancel: false,
	cancel_goto: false,
	pause: false,
	params: {
		move_attempts: 2,
		wavelength_range: 1, // nm, how close the measured value needs to be to the expected wavelength
		acceptance_range: 0.75, // cm-1, how close actual IR energy should be do desired on GoTo call
	},
	send_stored_info: () => ExcitationLaserManager_send_stored_info(),
	measure: async (expected_wavelength) => ExcitationLaserManager_measure(expected_wavelength),
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

// Update the excitation laser mode (e.g. NIR, IIR, MIR, or FIR)
laserEmitter.on(LASER.UPDATE.EXCITATION.MODE, (mode) => {
	ExcitationLaserManager.stored.selected_mode = mode;
	ExcitationLaserManager.send_stored_info();
});

// User update of excitation nIR wavelength
laserEmitter.on(LASER.UPDATE.EXCITATION.NIRWL, (wavelength) => {
	if (wavelength) {
		ExcitationLaserManager.stored.nIR.wavelength = wavelength;
	} else {
		ExcitationLaserManager.stored.nIR.wavelength = 0;
	}
	// Send back converted values
	ExcitationLaserManager.send_stored_info();
});

// Request to measure excitation wavelength
laserEmitter.on(LASER.MEASURE.EXCITATION, async () => {
	let measurement = await ExcitationLaserManager.measure();
	if (measurement.wavelength) {
		ExcitationLaserManager.stored.nIR.wavelength = measurement.wavelength;
	} else {
		ExcitationLaserManager.stored.nIR.wavelength = 0;
	}
	// Send back converted values
	ExcitationLaserManager.send_stored_info();
});

laserEmitter.on(LASER.MEASURE.CANCEL.EXCITATION, () => {
	ExcitationLaserManager.cancel = true;
});

// GoTo IR Energy requested
// @param: desired_energy should be a number corresponding to the desired IR energy in wavenumbers (cm-1)
laserEmitter.on(LASER.GOTO.EXCITATION, move_opo_wavelength);

// Pause OPO GoTo wavelength movement
laserEmitter.on(LASER.GOTO.PAUSE, () => {
	ExcitationLaserManager.pause = true;
	laserEmitter.emit(LASER.ALERT.GOTO.PAUSED);
});

// Resume OPO GoTo wavelength movement
laserEmitter.on(LASER.GOTO.RESUME, () => {
	if (!ExcitationLaserManager.pause) return; // GoTo is not paused, do nothing
	ExcitationLaserManager.pause = false;
	laserEmitter.emit(LASER.ALERT.GOTO.RESUMED);
});

// Cancel OPO GoTo wavelength movement
laserEmitter.on(LASER.GOTO.CANCEL, () => {
	ExcitationLaserManager.cancel = true;
	ExcitationLaserManager.cancel_goto = true;
	// Send message to OPO to stop moving
	opo.stop_movement();
});

// If OPO GoTo movement canceled, update check bool
laserEmitter.on(LASER.ALERT.GOTO.CANCELED, () => {
	ExcitationLaserManager.cancel_goto = false;
	ExcitationLaserManager.cancel = false;
});

/****
		Functions
****/

function ExcitationLaserManager_send_stored_info() {
	laserEmitter.emit(LASER.RESPONSE.EXCITATION.INFO, ExcitationLaserManager.stored);
}

async function ExcitationLaserManager_measure(expected_wavelength) {
	let channel = settings.laser.excitation.wavemeter_channel;
	let wavelength_range = ExcitationLaserManager.params.wavelength_range;
	let collection_length = settings.wavemeter.collection_length;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;
	let measurement = new WavemeterMeasurement();

	if (channel === -1) {
		// No wavemeter channel saved for the excitation laser, cancel
		msgEmitter.emit(MSG.ERROR, "No wavemeter channel selected for excitation");
		return measurement;
	}

	// Send alert that wavelength measurement has started
	laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STARTED);

	let fail_count = 0;
	let bad_measurement_count = 0;

	wavemeter.startMeasurement();
	while (measurement.wavelength_values.length < collection_length) {
		// Wait for next laser pulse (100ms / 10Hz)
		await sleep(100);
		if (ExcitationLaserManager.cancel) {
			ExcitationLaserManager.cancel = false;
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
			return measurement;
		}
		// If measurement is paused, stay in loop until it's resumed
		if (ExcitationLaserManager.pause) {
			continue;
		}
		// Check if there were too many failed measurements
		if (fail_count > max_fail_count) {
			// Stop measurement
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
			msgEmitter.emit(MSG.ERROR, `Excitation wavelength measurement had ${fail_count} failed measurements - canceled`);
			return measurement;
		}
		// Check if there were too many bad measurements
		if (bad_measurement_count > max_bad_measurements) {
			// Stop measurement
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
			msgEmitter.emit(MSG.ERROR, `Excitation wavelength measurement had ${bad_measurement_count} bad measurements - canceled`);
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
	laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
	// Calculate (reduced) average wavelength and update
	measurement.get_average();
	ExcitationLaserManager.measurement = measurement;
	return measurement;
}

// Similar to ExcitationLaserManager.measure(), except it communicates with OPO to figure out laser offset
async function measure_opo_wavelength() {
	// Request current wavelength from OPO
	opo.get_wavelength();
	await once(laserEmitter, LASER.RESPONSE.OPO.WAVELENGTH);
	let opo_wavelength = opo.status.current_wavelength;
	// Measure wavelength
	let measurement = await ExcitationLaserManager.measure(opo_wavelength);
	// Record laser wavelength and last laser offset in measurement object
	measurement.laser_wavelength = opo_wavelength;
	measurement.last_offset = ExcitationLaserManager.last_offset;
	// If the returned wavelength is not 0, update last_offset
	if (measurement.wavelength) ExcitationLaserManager.last_offset = measurement.laser_offset;
	// (This way, if the measurement was bad we might be able to work out what the actual wavelength was)
	return measurement;
}

/**
 *
 * @param {number} desired_energy Desired IR energy in cm-1
 */
async function move_opo_wavelength(desired_energy) {
	let energy_error;
	let move_attempts = ExcitationLaserManager.params.move_attempts;
	let desired_wavelength = new ExcitationWavelength();
	let desired_mode = desired_wavelength.get_nir({ wavenumber: desired_energy });
	if (!desired_mode) {
		// IR energy is not possible, send error alert
		msgEmitter.emit(MSG.ERROR, `IR Energy of ${desired_energy}cm-1 is not attainable`);
		return;
	}
	laserEmitter.emit(LASER.ALERT.GOTO.STARTED);
	// Make sure the OPO is in wavelength mode (since we specify to go to nIR wavelength)
	opo.wavelength_mode();
	// If the excitation wavemeter channel is not set, then we should move OPO without
	//	automatically measuring wavelength -> should move to desired wavelength in one attempt
	if (settings.laser.excitation.wavemeter_channel === -1) {
		move_attempts = 1;
	}
	let desired_nir = desired_wavelength.nIR.wavelength;
	// First, measure current wavelength and OPO offset
	let measurement = await measure_opo_wavelength();
	let converted_measurement = new ExcitationWavelength();
	converted_measurement.nIR.wavelength = measurement.wavelength;
	converted_measurement.selected_mode = desired_mode;
	// If the wavelength was successfully measured, account for offset and tell OPO where to go
	// If it was not measured, take the last offset and ^
	// In either case, the offset we want to use is stored in ExcitationLaserManager.last_offset
	let goto_wavelength = desired_nir - ExcitationLaserManager.last_offset;
	for (let i = 0; i < move_attempts; i++) {
		// Check if GoTo was canceled or paused
		if (ExcitationLaserManager.cancel_goto) {
			laserEmitter.emit(LASER.ALERT.GOTO.CANCELED);
			return;
		}
		if (ExcitationLaserManager.pause) {
			// Wait for it to be unpaused
			await once(laserEmitter, LASER.ALERT.GOTO.RESUMED);
		}
		// If the wavelength is more than 10nm away from where we are, have OPO move quickly (3 nm/sec)
		// If it's within 1nm, move slowly (0.05 nm/sec)
		let distance = Math.abs(goto_wavelength - measurement.laser_wavelength);
		if (distance > 10) opo.set_speed(3);
		else if (distance < 1) opo.set_speed(0.05);
		else opo.set_speed(); // Default speed
		// Tell OPO to move and wait
		await sleep(500);
		await opo.goto_nir(goto_wavelength);
		// Check if GoTo was canceled or paused
		if (ExcitationLaserManager.cancel_goto) {
			laserEmitter.emit(LASER.ALERT.GOTO.CANCELED);
			return;
		}
		if (ExcitationLaserManager.pause) {
			// Wait for it to be unpaused
			await once(laserEmitter, LASER.ALERT.GOTO.RESUMED);
		}
		// Once done moving, remeasure wavelength
		measurement = await measure_opo_wavelength();
		converted_measurement.nIR.wavelength = measurement.wavelength;
		// If the energy is close enough, stop here
		energy_error = Math.abs(converted_measurement.energy.wavenumber - desired_energy);
		if (energy_error <= ExcitationLaserManager.params.acceptance_range) {
			break;
		}
		// If not, try again using current offset
		goto_wavelength = desired_nir - ExcitationLaserManager.last_offset;
	}
	// Reset OPO speed
	opo.set_speed();
	// Replace stored wavelength with what's currently measured
	ExcitationLaserManager.stored = converted_measurement;
	// Send update of current wavelength
	laserEmitter.emit(LASER.ALERT.GOTO.STOPPED);
	ExcitationLaserManager.send_stored_info();
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
			set_to_wavelength_mode: "SETWL",
			stop_all: "STOP ALL",
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
		opo.network.client.write(opo.network.command.get_wavelength, () => {});
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
	goto_nir: async (nir_wavelength) => opo_goto_nir(nir_wavelength),
	/**
	 * Set OPO movement speed (in nm/sec)
	 * @param {number} speed - OPO nIR movement speed (in nm/sec)
	 */
	set_speed: (speed) => {
		let nIR_speed = speed || 1.0; // Default value of 1 nm/sec
		opo.network.client.write(`SETSPD ${nIR_speed.toFixed(3)}`, () => {});
	},
	/**
	 * Set OPO to work in wavelength mode (as opposed to wavenumber mode)
	 */
	wavelength_mode: () => {
		opo.network.client.write(opo.network.command.set_to_wavelength_mode, () => {});
	},
	/**
	 * Stop OPO movement
	 */
	stop_movement: () => {
		opo.network.client.write(opo.network.command.stop_all, () => {});
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

laserEmitter.on(LASER.QUERY.OPO.WAVELENGTH, () => {
	opo.get_wavelength();
});

/****
		Functions
****/

// Startup function, called from startup.js to initialize OPO
function opo_startup() {
	// Update OPO settings
	if (settings) {
		opo.network.config.host = settings.opo.host;
		opo.network.config.port = settings.opo.port;
	}

	opo.network.connect();
	opo.get_wavelength();
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
	laserEmitter.emit(LASER.RESPONSE.OPO.WAVELENGTH, wavelength);
}

// Tell OPO to move to nIR wavelength
async function opo_goto_nir(nir_wavelength) {
	opo.status.motors_moving = true;
	laserEmitter.emit(LASER.ALERT.OPO.MOTORS.MOVING);
	console.log(opo.network.command.move(nir_wavelength));
	opo.network.client.write(opo.network.command.move(nir_wavelength), () => {});
	await wait_for_opo_motors(); // Send an update when motors have stopped
}

// Async function that resolves when the OPO motors have stopped moving
async function wait_for_opo_motors() {
	// Check if motors are moving every 250ms
	while (opo.status.motors_moving) {
		opo.get_motor_status();
		await sleep(250);
	}
	// Send alert that motors have stopped
	laserEmitter.emit(LASER.ALERT.OPO.MOTORS.STOPPED);
	return true;
}

/*****************************************************************************

						DETACHMENT LASER MANAGER

*****************************************************************************/

const DetachmentLaserManager = {
	stored: new DetachmentWavelength(),
	conversion: new DetachmentWavelength(),
	measurement: new WavemeterMeasurement(),
	last_offset: 0,
	cancel: false,
	params: {
		move_attempts: 2,
		wavelength_range: 1, // nm, how close the measured value needs to be to the expected wavelength
	},
	send_stored_info: () => DetachmentLaserManager_send_stored_info(),
	measure: async (expected_wavelength) => DetachmentLaserManager_measure(expected_wavelength),
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

laserEmitter.on(LASER.UPDATE.DETACHMENT.MODE, (mode) => {
	DetachmentLaserManager.stored.selected_mode = mode;
	DetachmentLaserManager.send_stored_info();
});

laserEmitter.on(LASER.UPDATE.DETACHMENT.STANDARDWL, (wavelength) => {
	if (wavelength) {
		DetachmentLaserManager.stored.standard.wavelength = wavelength;
	} else {
		DetachmentLaserManager.stored.standard.wavelength = 0;
	}
	// Send back converted values
	DetachmentLaserManager.send_stored_info();
});

// Request to measure detachment wavelength
laserEmitter.on(LASER.MEASURE.DETACHMENT, async () => {
	let measurement = await DetachmentLaserManager.measure();
	if (measurement.wavelength) {
		DetachmentLaserManager.stored.standard.wavelength = measurement.wavelength;
	} else {
		DetachmentLaserManager.stored.standard.wavelength = 0;
	}
	// Send back converted values
	DetachmentLaserManager.send_stored_info();
});

laserEmitter.on(LASER.MEASURE.CANCEL.DETACHMENT, () => {
	DetachmentLaserManager.cancel = true;
});

/****
		Functions
****/

function DetachmentLaserManager_send_stored_info() {
	laserEmitter.emit(LASER.RESPONSE.DETACHMENT.INFO, DetachmentLaserManager.stored);
}

async function DetachmentLaserManager_measure(expected_wavelength) {
	let channel = settings.laser.detachment.wavemeter_channel;
	let wavelength_range = DetachmentLaserManager.params.wavelength_range;
	let collection_length = settings.wavemeter.collection_length;
	let max_fail_count = settings.wavemeter.max_fail_count;
	let max_bad_measurements = settings.wavemeter.max_bad_measurements;
	let measurement = new WavemeterMeasurement();

	if (channel === -1) {
		// No wavemeter channel saved for the detachment laser, cancel
		msgEmitter.emit(MSG.ERROR, "No wavemeter channel selected for detachment");
		return measurement;
	}

	// Send alert that wavelength measurement has started
	laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STARTED);

	let fail_count = 0;
	let bad_measurement_count = 0;

	wavemeter.startMeasurement();
	while (measurement.wavelength_values.length < collection_length) {
		// Wait for next laser pulse (50ms / 20Hz)
		await sleep(50);
		if (DetachmentLaserManager.cancel) {
			DetachmentLaserManager.cancel = false;
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STOPPED);
			return measurement;
		}
		// Check if there were too many failed measurements
		if (fail_count > max_fail_count) {
			// Stop measurement
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STOPPED);
			msgEmitter.emit(MSG.ERROR, `Detachment wavelength measurement had ${fail_count} failed measurements - canceled`);
			return measurement;
		}
		// Check if there were too many bad measurements
		if (bad_measurement_count > max_bad_measurements) {
			// Stop measurement
			wavemeter.stopMeasurement();
			laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STOPPED);
			msgEmitter.emit(MSG.ERROR, `Detachment wavelength measurement had ${bad_measurement_count} bad measurements - canceled`);
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
	laserEmitter.emit(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STOPPED);
	// Calculate (reduced) average wavelength and update
	measurement.get_average();
	DetachmentLaserManager.measurement = measurement;
	return measurement;
}

/* Functions for simulating wavemeter on Mac */

/**
 * This function is called solely from C++ file (wavemeter_mac.cc)
 * 	to simulate the wavemeter
 * Return a wavelength close to OPO's wavelength
 */
let failed_measurement_bool = false;
let bad_measurement_bool = false;
function mac_wavelength(channel) {
	if (channel === settings.laser.detachment.wavemeter_channel) {
		// Just send 650nm (with some noise) as the detachment laser wavelength
		return 650 + norm_rand(0, 0.01);
	} else if (channel === settings.laser.excitation.wavemeter_channel) {
		// Send wavelength as the OPO's wavelength with some noise added
		let wl = opo.status.current_wavelength;
		// Add some noise
		wl += norm_rand(0, 0.5);
		// Small chance of wavelength being very far off
		if (Math.random() < 0.1) {
			wl -= 20;
		}
		if (failed_measurement_bool) wl = 0;
		if (bad_measurement_bool) {
			if (Math.random() < 0.8) wl -= 20;
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

async function test_wavelength_measurement(measurement_count, fail_type) {
	// fail_type is either "fail" (or 1) or "bad" (or 2)
	let start, stop;
	for (let i = 0; i < measurement_count; i++) {
		start = once(laserEmitter, LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STARTED);
		stop = once(laserEmitter, LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
		await start;
		await stop;
	}
	if (fail_type === "fail" || fail_type === 1) {
		failed_measurement_bool = true;
	} else if (fail_type === "bad" || fail_type === 2) {
		bad_measurement_bool = true;
	}
	start = once(laserEmitter, LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STARTED);
	stop = once(laserEmitter, LASER.ALERT.WAVEMETER.MEASURING.EXCITATION.STOPPED);
	await start;
	await stop;
	failed_measurement_bool = false;
	bad_measurement_bool = false;
	console.log("Test Done!");
	return "Test Done!";
}
