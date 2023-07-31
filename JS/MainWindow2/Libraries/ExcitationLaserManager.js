/************************************************** 

		Control for IR Excitation Laser

**************************************************/

const { ManagerAlert } = require("./ManagerAlert.js");
const { ExcitationWavelength } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");

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
	conversion: new ExcitationWavelength(),
	measurement: new WavemeterMeasurement(),
	last_offset: 0,
	cancel: false,
	cancel_goto: false,
	pause: false,
	params: {
		move_attempts: 2,
		acceptance_range: 0.75, // cm-1, how close actual IR energy should be do desired on GoTo call
	},
	status: {
		measuring_wavelength: false,
		goto_movement: false,
	},
	send_stored_info: () => ExcitationLaserManager_send_stored_info(),
	measure: async (expected_wavelength) => ExcitationLaserManager_measure(expected_wavelength),
};

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
		excitation: {
			mode: new ManagerAlert(),
			energy: new ManagerAlert(),
		},
	},
};
