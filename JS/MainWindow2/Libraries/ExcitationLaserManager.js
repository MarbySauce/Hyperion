const { ManagerAlert } = require("./ManagerAlert.js");
const { DetachmentWavelength, ExcitationWavelength } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");

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
