/************************************************** 

			Control for IR-SEVI UI elements

**************************************************/

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

uiEmitter.on(UI.LOAD.IRSEVI, load_irsevi_info);

function load_irsevi_info() {
	// Information to load:
	//		Image ID
	//		VMI Info
	//		Laser Info
	//		Accumulated Image
	//		Electron Info
	//		PES Display

	uiEmitter.emit(UI.INFO.QUERY.IMAGEID);
	uiEmitter.emit(UI.INFO.QUERY.VMI);

	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);
	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAMEIR);

	seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
	// (set up listener with .once(), then ask if it's running with .emit() )
	seviEmitter.once(SEVI.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) {
			// A scan is currently running, request it be stopped
			seviEmitter.emit(SEVI.SCAN.STOP);
		} else {
			// Start a new SEVI scan
			seviEmitter.emit(SEVI.SCAN.STARTIR);
		}
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
};
document.getElementById("IRSeviScanPauseResume").onclick = function () {
	// Pause/Resume logic moved to sevi.js bc ImageManager should be figuring out what to do
	seviEmitter.emit(SEVI.SCAN.PAUSERESUME);
};
document.getElementById("IRSeviScanCancel").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.CANCEL);
};
document.getElementById("IRSeviScanAutosave").onclick = function () {
	//autosave_button();
};
document.getElementById("IRSeviScanReset").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.RESET);
};
document.getElementById("IRSeviScanSingleShot").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.SINGLESHOT);
};

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

// When new scan is started, change Start/Save to Save and Pause/Resume to Pause
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	change_irsevi_button_to_save();
	change_irsevi_button_to_pause();
});
// When a scan is saved, change Start/Save to Start and Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	change_irsevi_button_to_start();
	change_irsevi_button_to_resume();
});
// When a scan is paused, change Pause/Resume to Resume and add pause overlay
seviEmitter.on(SEVI.ALERT.SCAN.PAUSED, () => {
	change_irsevi_button_to_resume();
	// NOTE TO Marty: Need to add stuff for pause animation
});
// When a scan is resumed, change Pause/Resume to Pause and remove pause overlay
// Change Start/Save to Save
seviEmitter.on(SEVI.ALERT.SCAN.RESUMED, () => {
	change_irsevi_button_to_pause();
	change_irsevi_button_to_save();
	// NOTE TO Marty: Need to add stuff for pause animation
});
// When a scan is canceled, change Start/Save to Start
// Change Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.CANCELED, () => {
	change_irsevi_button_to_start();
	change_irsevi_button_to_resume();
});

// It's updating the Image ID twice here... Need to think of best practice to avoid this.

/****
		Functions
****/

// Change SEVI Start/Save button to Start
function change_irsevi_button_to_start() {
	const start_button_text = document.getElementById("IRSeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Start";
}

// Change SEVI Start/Save button to Save
function change_irsevi_button_to_save() {
	const start_button_text = document.getElementById("IRSeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Save";
}

// Change SEVI Pause/Resume button to Pause
function change_irsevi_button_to_pause() {
	const pause_button_text = document.getElementById("IRSeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
}

// Change SEVI Pause/Resume button to Resume
function change_irsevi_button_to_resume() {
	const pause_button_text = document.getElementById("IRSeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Resume";
}

/*****************************************************************************

							FILE NAMING

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviImageCounterUp").onclick = function () {
	uiEmitter.emit(UI.CHANGE.IMAGEID.INCREASE);
};
document.getElementById("IRSeviImageCounterDown").onclick = function () {
	uiEmitter.emit(UI.CHANGE.IMAGEID.DECREASE);
};
document.getElementById("IRSeviVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("IRSeviVMIMode");
	uiEmitter.emit(UI.CHANGE.VMI.INDEX, vmi_mode.selectedIndex);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.INFO.RESPONSE.IMAGEID, update_irsevi_image_id);
uiEmitter.on(UI.INFO.RESPONSE.VMI, update_irsevi_vmi);

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.SCAN.FILENAME, update_irsevi_filename);
seviEmitter.on(SEVI.RESPONSE.SCAN.FILENAMEIR, update_irsevi_filename_ir);

/****
		Functions
****/

function update_irsevi_image_id(image_id) {
	const image_counter = document.getElementById("IRSeviImageCounter");
	image_counter.value = image_id;
}

function update_irsevi_filename(filename) {
	const irsevi_filename = document.getElementById("IRSeviCurrentImageFile");
	irsevi_filename.value = filename;
}

function update_irsevi_filename_ir(filename_ir) {
	const irsevi_filename_ir = document.getElementById("IRSeviCurrentImageFileIR");
	irsevi_filename_ir.value = filename_ir;
}

function update_irsevi_vmi(vmi_info) {
	const vmi_mode = document.getElementById("IRSeviVMIMode");
	vmi_mode.selectedIndex = vmi_info.index;
}

/*****************************************************************************

							LASER CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviWavelengthMode").oninput = function () {
	update_irsevi_detachment_mode();
};

document.getElementById("IRSeviIRWavelengthMode").oninput = function () {
	update_irsevi_excitation_mode();
};

document.getElementById("IRSeviMeasureDetachmentWavelength").onclick = function () {
	const measure_button = document.getElementById("IRSeviMeasureDetachmentWavelength");
	laserEmitter.emit(LASER.MEASURE.DETACHMENT);
	measure_button.disabled = true;
};

document.getElementById("IRSeviMeasureExcitationWavelength").onclick = function () {
	const measure_button = document.getElementById("IRSeviMeasureExcitationWavelength");
	laserEmitter.emit(LASER.MEASURE.EXCITATION);
	measure_button.disabled = true;
};

document.getElementById("IRSeviMoveIRButton").onclick = function () {
	irsevi_goto_ir();
};

// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
// (that way it doesn't execute for each character inputted)

const update_irsevi_detachment_wavelength_delay = new InputDelay(update_irsevi_detachment_wavelength);
document.getElementById("IRSeviDetachmentWavelength").oninput = function () {
	update_irsevi_detachment_wavelength_delay.start_timer();
};

const update_irsevi_excitation_wavelength_delay = new InputDelay(update_irsevi_excitation_wavelength);
document.getElementById("IRSeviIRWavelength").oninput = function () {
	update_irsevi_excitation_wavelength_delay.start_timer();
};

/****
		UI Event Listeners
****/

/****
		Laser Event Listeners
****/

laserEmitter.on(LASER.RESPONSE.DETACHMENT.INFO, update_irsevi_detachment_energies);

laserEmitter.on(LASER.RESPONSE.EXCITATION.INFO, update_irsevi_excitation_energies);

laserEmitter.on(LASER.ALERT.GOTO.CANCELED, () => {
	// Re-enable GoTo button
	document.getElementById("IRSeviMoveIRButton").disabled = false;
});

/****
		Functions
****/

function update_irsevi_detachment_wavelength() {
	const detachment_wavelength = document.getElementById("IRSeviDetachmentWavelength");
	laserEmitter.emit(LASER.UPDATE.DETACHMENT.STANDARDWL, parseFloat(detachment_wavelength.value));
}

function update_irsevi_detachment_mode() {
	const detachment_mode = document.getElementById("IRSeviWavelengthMode");
	const mode_list = [LASER.MODE.DETACHMENT.STANDARD, LASER.MODE.DETACHMENT.DOUBLED, LASER.MODE.DETACHMENT.RAMAN, LASER.MODE.DETACHMENT.IRDFG];
	laserEmitter.emit(LASER.UPDATE.DETACHMENT.MODE, mode_list[detachment_mode.selectedIndex]);
}

function update_irsevi_detachment_energies(detachment_wl_class) {
	const input_wavelength = document.getElementById("IRSeviDetachmentWavelength");
	const converted_wavelength = document.getElementById("IRSeviConvertedWavelength");
	const converted_wavenumber = document.getElementById("IRSeviDetachmentWavenumber");
	const detachment_mode = document.getElementById("IRSeviWavelengthMode");
	// If the sent energy values are 0, leave all boxes blank
	if (detachment_wl_class.energy.wavelength === 0) {
		input_wavelength.value = "";
		converted_wavelength.value = "";
		converted_wavenumber.value = "";
	}
	// If the sent energy mode is Standard, don't leave the converted_wavelength box blank
	else if (detachment_wl_class.selected_mode === LASER.MODE.DETACHMENT.STANDARD) {
		converted_wavelength.value = "";
		converted_wavenumber.value = detachment_wl_class.energy.wavenumber.toFixed(3);
	}
	// Update the boxes with the sent energies
	else {
		converted_wavelength.value = detachment_wl_class.energy.wavelength.toFixed(3);
		converted_wavenumber.value = detachment_wl_class.energy.wavenumber.toFixed(3);
	}

	// Update the input box too (in case the values were changed on the SEVI tab)
	if (detachment_wl_class.standard.wavelength === 0) input_wavelength.value = "";
	else input_wavelength.value = detachment_wl_class.standard.wavelength.toFixed(3);

	// Update selected mode
	switch (detachment_wl_class.selected_mode) {
		case LASER.MODE.DETACHMENT.STANDARD:
			detachment_mode.selectedIndex = 0;
			break;
		case LASER.MODE.DETACHMENT.DOUBLED:
			detachment_mode.selectedIndex = 1;
			break;
		case LASER.MODE.DETACHMENT.RAMAN:
			detachment_mode.selectedIndex = 2;
			break;
		case LASER.MODE.DETACHMENT.IRDFG:
			detachment_mode.selectedIndex = 3;
			break;
		default:
			detachment_mode.selectedIndex = 0;
			break;
	}

	// Enable measure button if it was disabled
	document.getElementById("IRSeviMeasureDetachmentWavelength").disabled = false;
}

function update_irsevi_excitation_wavelength() {
	const excitation_wavelength = document.getElementById("IRSeviIRWavelength");
	laserEmitter.emit(LASER.UPDATE.EXCITATION.NIRWL, parseFloat(excitation_wavelength.value));
}

function update_irsevi_excitation_mode() {
	const excitation_mode = document.getElementById("IRSeviIRWavelengthMode");
	const mode_list = [LASER.MODE.EXCITATION.NIR, LASER.MODE.EXCITATION.IIR, LASER.MODE.EXCITATION.MIR, LASER.MODE.EXCITATION.FIR];
	laserEmitter.emit(LASER.UPDATE.EXCITATION.MODE, mode_list[excitation_mode.selectedIndex]);
}

function update_irsevi_excitation_energies(excitation_wl_class) {
	const input_wavelength = document.getElementById("IRSeviIRWavelength");
	const converted_wavelength = document.getElementById("IRSeviIRConvertedWavelength");
	const converted_wavenumber = document.getElementById("IRSeviIRWavenumber");
	const excitation_mode = document.getElementById("IRSeviIRWavelengthMode");
	// If the sent energy values are 0, leave all boxes blank
	if (excitation_wl_class.energy.wavelength === 0) {
		input_wavelength.value = "";
		converted_wavelength.value = "";
		converted_wavenumber.value = "";
	}
	// If the sent energy mode is Standard, don't leave the converted_wavelength box blank
	else if (excitation_wl_class.selected_mode === LASER.MODE.EXCITATION.NIR) {
		converted_wavelength.value = "";
		converted_wavenumber.value = excitation_wl_class.energy.wavenumber.toFixed(3);
	}
	// Update the boxes with the sent energies
	else {
		converted_wavelength.value = excitation_wl_class.energy.wavelength.toFixed(3);
		converted_wavenumber.value = excitation_wl_class.energy.wavenumber.toFixed(3);
	}

	// Update the input box too (in case the values were changed on the SEVI tab)
	if (excitation_wl_class.nIR.wavelength === 0) input_wavelength.value = "";
	else input_wavelength.value = excitation_wl_class.nIR.wavelength.toFixed(3);

	// Update selected mode
	switch (excitation_wl_class.selected_mode) {
		case LASER.MODE.EXCITATION.NIR:
			excitation_mode.selectedIndex = 0;
			break;
		case LASER.MODE.EXCITATION.IIR:
			excitation_mode.selectedIndex = 1;
			break;
		case LASER.MODE.EXCITATION.MIR:
			excitation_mode.selectedIndex = 2;
			break;
		case LASER.MODE.EXCITATION.FIR:
			excitation_mode.selectedIndex = 3;
			break;
		default:
			excitation_mode.selectedIndex = 0;
			break;
	}

	// Enable measure button and GoTo button if disabled
	document.getElementById("IRSeviMeasureExcitationWavelength").disabled = false;
	document.getElementById("IRSeviMoveIRButton").disabled = false;
}

// Go to desired IR Energy
function irsevi_goto_ir() {
	const energy_input = document.getElementById("IRSeviDesiredEnergy");
	const energy_unit = document.getElementById("IRSeviDesiredEnergyUnit");
	let energy_input_value = parseFloat(energy_input.value);
	// Need to send energy in cm-1, so we might need to convert
	switch (energy_unit.selectedIndex) {
		case 0: // cm-1
			break;
		case 1: // nm
			energy_input_value = 1e7 / energy_input_value;
			break;
		case 2: // um
			energy_input_value = 1e4 / energy_input_value;
			break;
	}
	// Disable GoTo button
	document.getElementById("IRSeviMoveIRButton").disabled = true;

	laserEmitter.emit(LASER.GOTO.EXCITATION, energy_input_value);
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviImageDisplaySelect").oninput = function () {
	update_irsevi_accumulated_image_display();
};

document.getElementById("IRSeviDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("IRSeviDisplaySlider");
	uiEmitter.emit(UI.CHANGE.DISPLAYSLIDERVALUE, display_slider.value);
	// Update image display
	update_irsevi_accumulated_image_display();
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
	// We only want to update the image on a new camera frame if
	// (a) the user is on the IR-SEVI tab AND
	// (b) an image is currently being run AND
	// (c) that image is not currently paused
	let current_tab = once(uiEmitter, UI.INFO.RESPONSE.CURRENTTAB); // (a)
	let image_running = once(seviEmitter, SEVI.RESPONSE.SCAN.RUNNING); // (b)
	let image_paused = once(seviEmitter, SEVI.RESPONSE.SCAN.PAUSED); // (c)
	// Send query requests
	uiEmitter.emit(UI.INFO.QUERY.CURRENTTAB);
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
	seviEmitter.emit(SEVI.QUERY.SCAN.PAUSED);
	// Wait for messages to be received (for promises to be resolved)
	// and replace variables with the returned values from each message
	[[current_tab], [image_running], [image_paused]] = await Promise.all([current_tab, image_running, image_paused]);
	// Make sure all values are correct
	if (current_tab !== UI.TAB.IRSEVI) return;
	if (!image_running) return;
	if (image_paused) return;
	// If everything passed, update display
	update_irsevi_accumulated_image_display();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.INFO.RESPONSE.DISPLAYSLIDERVALUE, (value) => {
	const display_slider = document.getElementById("IRSeviDisplaySlider");
	display_slider.value = value;
});

/****
		SEVI Event Listeners
****/

// Update accumulated image display when scan is reset
seviEmitter.on(SEVI.ALERT.SCAN.RESET, update_irsevi_accumulated_image_display);

/****
		Functions
****/

function update_irsevi_accumulated_image_display() {
	const image_display = document.getElementById("IRSeviDisplay");
	const ctx = image_display.getContext("2d");
	const image_display_select = document.getElementById("IRSeviImageDisplaySelect");
	seviEmitter.once(SEVI.RESPONSE.IMAGE, (image_data) => {
		if (!image_data) return; // No ImageData object was sent
		// Clear the current image
		ctx.clearRect(0, 0, image_display.width, image_display.height);
		// Put image_data on the display
		// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
		createImageBitmap(image_data).then(function (bitmap_img) {
			ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
		});
	});
	switch (image_display_select.selectedIndex) {
		case 0: // IR Off
			seviEmitter.emit(SEVI.QUERY.IMAGE.IROFF);
			break;
		case 1: // IR On
			seviEmitter.emit(SEVI.QUERY.IMAGE.IRON);
			break;
		case 2: // Difference Positive
			seviEmitter.emit(SEVI.QUERY.IMAGE.DIFFPOS);
			break;
		case 3: // Difference Negative
			seviEmitter.emit(SEVI.QUERY.IMAGE.DIFFNEG);
			break;
	}
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.COUNTS.TOTAL, update_irsevi_counters);

/****
		Functions
****/

function update_irsevi_counters(counts) {
	// counts should look like Image.counts
	// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
	const total_frames_off = document.getElementById("IRSeviTotalFrames");
	const total_frames_on = document.getElementById("IRSeviTotalFramesIROn");
	const total_electrons_off = document.getElementById("IRSeviTotalECount");
	const total_electrons_on = document.getElementById("IRSeviTotalECountIROn");
	let formatted_electrons_off, formatted_electrons_on;
	if (counts.electrons.off > 10000) {
		formatted_electrons_off = counts.electrons.off.toExponential(3);
	} else {
		formatted_electrons_off = counts.electrons.off.toString();
	}
	if (counts.electrons.on > 10000) {
		formatted_electrons_on = counts.electrons.on.toExponential(3);
	} else {
		formatted_electrons_on = counts.electrons.on.toString();
	}

	total_frames_off.value = counts.frames.off;
	total_frames_on.value = counts.frames.on;
	total_electrons_off.value = formatted_electrons_off;
	total_electrons_on.value = formatted_electrons_on;
}
