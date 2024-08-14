/************************************************** 

		Control for LaserVision OPO/A

**************************************************/

// OPO/A is controlled through TCP communication, which is done through JS module Net
const net = require("net");
const { ManagerAlert } = require("../../Libraries/ManagerAlert.js");
const { sleep } = require("../../Libraries/Sleep.js");
const { ExcitationWavelength, ExcitationMode } = require("../Libraries/WavelengthClasses.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

class OPOMotorState {
	static MOVING = new OPOMotorState();
	static STOPPED = new OPOMotorState();
}

/*****************************************************************************

								OPO MANAGER

*****************************************************************************/

const OPOManager = {
	status: OPOMotorState.STOPPED,
	params: {
		lower_wavelength_bound: 710,
		upper_wavelength_bound: 880,
		fir_lower_wavelength_bound: 725, // Lower bound in fIR mode
		fir_upper_wavelength_bound: 765, // Upper bound in fIR mode
		in_fir_mode: false, // Whether OPO/A is using fIR crystal
	},
	network: {
		client: new net.Socket(),
		connected: false,
		config: {
			host: "localhost",
			port: 1315,
		},
		command: {
			get_wavelength: "TELLWL ",
			get_motor_status: "TELLSTAT ",
			set_to_wavelength_mode: "SETWL ",
			stop_all: "STOP ALL ",
			scanning_off: "SCOFF ",
			goto: (wavelength) => {
				return `GOTO ${wavelength.toFixed(3)} `;
			},
			/** Set OPO speed in nm/sec */
			set_speed: (speed) => {
				let nIR_speed = speed || 1.0; // Default value of 1 nm/sec
				return `SETSPD ${nIR_speed.toFixed(3)} `;
			},
		},
		/**
		 * Establish connection with OPO/A
		 */
		connect: () => {
			if (OPOManager.network.connected) {
				return;
			}
			OPOManager.network.client.connect(OPOManager.network.config, (error) => {
				if (error) {
					// Send error alert
					update_messenger.error("Could Not Connect to OPO! - Error Logged to Console");
					console.log(`Could not connect to OPO: ${error}`);
				} else {
					OPOManager.network.connected = true;
					OPOMAlerts.event.connection.open.alert();
					update_messenger.update("Established Connection with OPO/A!");
				}
			});
		},
		/**
		 * Close connection with OPO/A
		 */
		close: () => {
			OPOManager.network.client.end();
			OPOManager.network.connected = false;
			OPOMAlerts.event.connection.close.alert();
			update_messenger.update("Connection with OPO/A Closed!");
		},
	},

	current_wavelength: 0,
	laser_offsets: [],

	/**
	 * Get the nIR wavelength recorded by the OPO
	 */
	get_wavelength: () => {
		if (!OPOManager.network.connected) {
			// OPO not connected, send alert of 0
			OPOMAlerts.info_update.wavelength.alert(0);
			return;
		}
		OPOManager.network.client.write(OPOManager.network.command.get_wavelength, () => {});
	},
	/**
	 * Update the wavelength stored in opo object
	 * @param {number} wavelength nIR wavelength (nm)
	 */
	update_wavelength: (wavelength) => {
		OPOManager.current_wavelength = wavelength;
		OPOMAlerts.info_update.wavelength.alert(wavelength);
	},
	/**
	 * Get status of OPO motors
	 */
	get_motor_status: () => {
		OPOManager.network.client.write(OPOManager.network.command.get_motor_status, () => {});
	},
	/**
	 * Move OPO to specific nIR wavelength (async function)
	 * @param {number} nir_wavelength nIR wavelength (nm)
	 */
	goto_nir: async (nir_wavelength) => {
		if (!OPOManager.network.connected) {
			// OPO is not connected
			update_messenger.error(`Cannot go to requested nIR wavelength, OPO is not connected!`);
			return;
		}
		if (nir_wavelength < OPOManager.params.lower_wavelength_bound || nir_wavelength > OPOManager.params.upper_wavelength_bound) {
			update_messenger.error(
				`nIR wavelength ${nir_wavelength.toFixed(3)}nm is out of set bounds of ${OPOManager.params.lower_wavelength_bound} - ${
					OPOManager.params.upper_wavelength_bound
				}`
			);
			return;
		}
		OPOManager.status = OPOMotorState.MOVING;
		OPOMAlerts.event.motors.start.alert();
		OPOManager.network.client.write(OPOManager.network.command.goto(nir_wavelength), () => {});
		await wait_for_opo_motors();
	},
	/**
	 * Set OPO movement speed (in nm/sec)
	 * @param {number} speed OPO nIR movement speed (in nm/sec)
	 */
	set_speed: (speed) => {
		OPOManager.network.client.write(OPOManager.network.command.set_speed(speed), () => {});
	},
	/**
	 * Set OPO to work in wavelength mode (as opposed to wavenumber mode)
	 */
	wavelength_mode: () => {
		OPOManager.network.client.write(OPOManager.network.command.set_to_wavelength_mode, () => {});
	},
	/**
	 * Stop OPO movement
	 */
	stop_movement: () => {
		// Either "SCOFF" or "STOP ALL" should work - not sure which is the better choice
		// Dean Guyer said they're basically equivalent but he'd choose "SCOFF"
		OPOManager.network.client.write(OPOManager.network.command.scanning_off, () => {});
		// Stop waiting for motors
		OPOManager.status = OPOMotorState.STOPPED;
	},

	get_laser_offset: () => OPOManager_get_laser_offset(),
	get_last_laser_offset: () => OPOManager_get_last_laser_offset(),
	process_settings: (settings) => OPOManager_process_settings(settings),
};

/****
		OPO client listeners
****/

// Receive message from OPO computer
OPOManager.network.client.on("data", (data) => {
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
OPOManager.network.client.on("error", (error) => {
	update_messenger.error("OPO Connection Error! - Error Logged to Console");
	console.log(`OPO Connection Error: ${error}`);
	OPOManager.status.connected = false;
});

/****
		Functions
****/

/**
 * Process data received from OPO/A
 * @param {String} data
 */
function process_opo_data(data) {
	// Get rid of newline character "/r/n"
	data = data.replace("\r\n", "");
	// Filter motor movement results, which are hexadecimal numbers
	if (data.startsWith("0x")) {
		// Note: Don't use triple equals here
		if (data == 0) {
			// Motors are done moving
			OPOManager.status = OPOMotorState.STOPPED;
			// Alert that motors have stopped moving
			OPOMAlerts.event.motors.stop.alert();
			return;
		}
		// Motors are still moving
		OPOManager.status = OPOMotorState.MOVING;
		return;
	}
	// Make sure it is a number (not an unexpected result)
	if (isNaN(data)) {
		return;
	}
	// Convert data to number
	data = parseFloat(data);
	// Check if it's an error code
	if (data < 10) {
		parse_opo_error(data);
		return;
	}
	// Only remaining option is it's the OPO's wavelength
	OPOManager.update_wavelength(data);
}

/**
 * Parse error returned by OPO
 * @param {Number} error_code - code returned by OPO
 */
function parse_opo_error(error_code) {
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
	update_messenger.error(`OPO Error #${error_code}: ${opo_errors[error_code]}`);
}

// Async function that resolves when the OPO motors have stopped moving
async function wait_for_opo_motors() {
	// Check if motors are moving every 250ms
	while (OPOManager.status === OPOMotorState.MOVING) {
		OPOManager.get_motor_status();
		await sleep(250);
	}
	return true;
}

function OPOManager_get_laser_offset() {
	if (OPOManager.laser_offsets.length === 0) return 0;
	// else: average all offsets and return
	let sum = OPOManager.laser_offsets.reduce((accumulator, current_value) => {
		return accumulator + current_value;
	});
	let average = sum / OPOManager.laser_offsets.length;
	if (isNaN(average)) return 0;
	return average;
}

function OPOManager_get_last_laser_offset() {
	let last_offset = OPOManager.laser_offsets[OPOManager.laser_offsets.length - 1];
	if (last_offset) return last_offset;
	else return 0;
}

function OPOManager_process_settings(settings) {
	if (settings?.opo) {
		OPOManager.network.config.host = settings.excitation_laser.host;
		OPOManager.network.config.port = settings.excitation_laser.port;
		OPOManager.params.lower_wavelength_bound = settings.excitation_laser.lower_wavelength_bound;
		OPOManager.params.upper_wavelength_bound = settings.excitation_laser.upper_wavelength_bound;
		OPOManager.params.fir_lower_wavelength_bound = settings.excitation_laser.fir_lower_wavelength_bound;
		OPOManager.params.fir_upper_wavelength_bound = settings.excitation_laser.fir_upper_wavelength_bound;
		OPOManager.params.in_fir_mode = settings.excitation_laser.in_fir_mode;
	}
	// Connect to OPO/A Computer
	if (!OPOManager.network.connected) {
		OPOManager.network.connect();
	}
	// Set to wavelength mode when connection is established
	OPOMAlerts.event.connection.open.add_once(() => {
		// Set to wavelength mode
		OPOManager.wavelength_mode();
		// Get current wavelength
		OPOManager.get_wavelength();
	});
}

/*****************************************************************************

							OPO MANAGER ALERTS

*****************************************************************************/

const OPOMAlerts = {
	event: {
		motors: {
			start: new ManagerAlert(),
			stop: new ManagerAlert(),
		},
		connection: {
			open: new ManagerAlert(),
			close: new ManagerAlert(),
		},
	},
	info_update: {
		wavelength: new ManagerAlert(),
	},
};

/*****************************************************************************

					OPO MANAGER MESSENGER COMPONENTS

*****************************************************************************/

// Three options are 1) Information (static), 2) Request event (action), 3) Update (action), 4) set up Update listener

/***************************************** 

	Used for accessing information

*****************************************/

/** Access information from OPO Manager */
class OPOMMessengerInformation {
	constructor() {
		this._status = {
			get moving() {
				return OPOManager.status === OPOMotorState.MOVING;
			},
			get stopped() {
				return OPOManager.status === OPOMotorState.STOPPED;
			},
		};
	}

	get status() {
		return this._status;
	}

	/** Get offset between OPO's internal wavelength value and measured wavelength */
	get offset() {
		return OPOManager.get_laser_offset();
	}

	/** Get the most recently stored offset */
	get last_offset() {
		return OPOManager.get_last_laser_offset();
	}

	/** Get OPO's last saved internal wavelength */
	get wavelength() {
		return OPOManager.current_wavelength;
	}

	/** Ask OPO for it's internal wavelength and wait for a response */
	async get_wavelength() {
		let promise = new Promise((resolve) => {
			OPOMAlerts.info_update.wavelength.add_once(resolve);
		});
		OPOManager.get_wavelength();
		await promise;
		return OPOManager.current_wavelength;
	}
}

/***************************************** 

	Used for executing an action

*****************************************/

/** Request OPO Manager take action */
class OPOMMessengerRequest {
	constructor() {}

	/** Establish connection with OPO/A */
	connect() {
		OPOManager.network.connect();
	}

	/** Close connection with OPO/A */
	close() {
		OPOManager.network.close();
	}

	/**
	 * Move OPO to desired nIR wavelength (async function)
	 * @param {Number} wavelength nIR wavelength
	 */
	async goto(wavelength) {
		await OPOManager.goto_nir(wavelength);
	}

	/**
	 * Stop OPO movement
	 */
	stop_movement() {
		OPOManager.stop_movement();
	}
}

/***************************************** 

  Used for updating/changing information

*****************************************/

/** Request OPO Manager information be updated or changed */
class OPOMMessengerUpdate {
	constructor() {}

	/**
	 * Update laser offset
	 * @param {Number} value (measured wavelength - OPO internal wavelength)
	 */
	laser_offset(value) {
		// Offset shouldn't be more than 1.5nm, if it is something went wrong
		if (Math.abs(value) < 1.5) OPOManager.laser_offsets.push(value);
	}

	/**
	 * Set OPO scanning speed
	 * @param {Number} speed OPO scanning speed in nm/sec
	 */
	set_speed(speed) {
		OPOManager.set_speed(speed);
	}

	/** Set OPO/A to wavelength mode */
	wavelength_mode() {
		OPOManager.wavelength_mode();
	}

	process_settings(settings) {
		OPOManager.process_settings(settings);
	}
}

/***************************************** 

	Used for listening to alerts

*****************************************/

/** Set up callback functions to be executed on alert */
class OPOMMessengerCallback {
	constructor() {
		this._event = new OPOMMessengerCallbackEvent();
		this._info_update = new OPOMMessengerCallbackInfoUpdate();
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
class OPOMMessengerCallbackEvent {
	constructor() {
		this._motors = {
			_start: {
				/**
				 * Execute callback function *every time* motor movement is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					OPOMAlerts.event.motors.start.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* motor movement is started
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					OPOMAlerts.event.motors.start.add_once(callback);
				},
			},
			_stop: {
				/**
				 * Execute callback function *every time* motor movement is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					OPOMAlerts.event.motors.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* motor movement is stopped
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					OPOMAlerts.event.motors.stop.add_once(callback);
				},
			},

			/** Listen for motors to start moving */
			get start() {
				return this._start;
			},
			/** Listen for motors to stop moving */
			get stop() {
				return this._stop;
			},
		};

		this._connection = {
			_open: {
				/**
				 * Execute callback function *every time* OPO/A Connection is opened
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* OPO/A Connection is opened
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.stop.add_once(callback);
				},
			},
			_close: {
				/**
				 * Execute callback function *every time* OPO/A Connection is closed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				on: (callback) => {
					IMAlerts.event.scan.stop.add_on(callback);
				},
				/**
				 * Execute callback function *once the next time* OPO/A Connection is closed
				 * @param {Function} callback function to execute on event - called with no arguments
				 */
				once: (callback) => {
					IMAlerts.event.scan.stop.add_once(callback);
				},
			},

			/** Listen for OPO/A network connection being opened */
			get open() {
				return this._open;
			},
			/** Listen for OPO/A network connection being closed */
			get close() {
				return this._close;
			},
		};
	}

	/** Set up callback functions to be executed when motor movement event occurs */
	get motors() {
		return this._motors;
	}

	/** Set up callback functions to be executed when network connection event occurs */
	get connection() {
		return this._connection;
	}
}

/***************************************** 
   Listen for information being updated
*****************************************/

/** Set up callback functions to be executed when information is updated */
class OPOMMessengerCallbackInfoUpdate {
	constructor() {
		this._wavelength = {
			/**
			 * Execute callback function *every time* OPO/A's internal wavelength is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `wavelength {Number}`: internal wavelength
			 */
			on: (callback) => {
				OPOMAlerts.info_update.wavelength.add_on(callback);
			},
			/**
			 * Execute callback function *once the next time* OPO/A's internal wavelength is updated
			 * @param {Function} callback function to execute on event -
			 * 		Called with argument `wavelength {Number}`: internal wavelength
			 */
			once: (callback) => {
				OPOMAlerts.info_update.wavelength.add_once(callback);
			},
		};
	}

	/** Set up callback functions to be executed when OPO/A internal wavelength is updated */
	get wavelength() {
		return this._wavelength;
	}
}

/*****************************************************************************

							OPO MANAGER MESSENGER

*****************************************************************************/

class OPOManagerMessenger {
	constructor() {
		this._information = new OPOMMessengerInformation();
		this._request = new OPOMMessengerRequest();
		this._update = new OPOMMessengerUpdate();
		this._listen = new OPOMMessengerCallback();
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

module.exports = { OPOManagerMessenger };
