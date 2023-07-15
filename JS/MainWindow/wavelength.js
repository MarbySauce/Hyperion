/************************************************** 

	Wavelength (and Wavemeter) Logic/Control

**************************************************/

const { DetachmentWavelength, ExcitationWavelength } = require("../JS/MainWindow/wavelengthClasses.js");

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
