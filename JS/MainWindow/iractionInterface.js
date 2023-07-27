/************************************************** 

			Control for IR Action UI elements

**************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

uiEmitter.on(UI.LOAD.IRACTION, load_iraction_info);

function load_iraction_info() {
	// Information to load:
	//		Image ID
	//		VMI Info
	//		Laser Info
	//		Accumulated Image
	//		Electron Info
	//		PES Display

	uiEmitter.emit(UI.QUERY.VMI);
	uiEmitter.emit(UI.QUERY.DISPLAY.SELECTEDINDEX);

	seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);

	hide_iraction_status_current_energy();
	hide_iraction_status_next_energy();
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRActionScanStartSave").onclick = function () {
	// Check if there is an action scan being taken or not
	// (set up listener with .once(), then ask if it's running with .emit() )
	actionEmitter.once(IRACTION.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) {
			// A scan is currently running, request it be stopped
			actionEmitter.emit(IRACTION.SCAN.STOP);
		} else {
			// Start a new IR Action scan
			// Get scan options
			if (update_iraction_options()) {
				// Only continue if getting options had no errors (returned true)
				actionEmitter.emit(IRACTION.SCAN.START);
			}
		}
	});
	actionEmitter.emit(IRACTION.QUERY.SCAN.RUNNING);
};

document.getElementById("IRActionScanPauseResume").onclick = function () {
	actionEmitter.emit(IRACTION.SCAN.PAUSERESUME);
};

document.getElementById("IRActionScanCancel").onclick = function () {
	actionEmitter.emit(IRACTION.SCAN.CANCEL);
};

document.getElementById("IRActionImageSave").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.STOP);
};

document.getElementById("IRActionImageReset").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.RESET);
};

document.getElementById("IRActionRemeasureWavelength").onclick = function () {
	actionEmitter.emit(IRACTION.SCAN.REMEASUREWL);
};

/****
		UI Event Listeners
****/

/****
		IR Action Event Listeners
****/

// IR Action scan has been started
actionEmitter.on(IRACTION.ALERT.SCAN.STARTED, () => {
	change_iraction_button_to_save();
	change_iraction_button_to_pause();
	enable_iraction_pause_button();
	enable_iraction_cancel_button();
});

// IR Action scan has been completed
actionEmitter.on(IRACTION.ALERT.SCAN.STOPPED, () => {
	change_iraction_button_to_start();
	change_iraction_button_to_pause();
	disable_iraction_pause_button();
	disable_iraction_cancel_button();
});

// IR Action scan has been paused
actionEmitter.on(IRACTION.ALERT.SCAN.PAUSED, () => {
	change_iraction_button_to_resume();
});

// IR Action scan has been resumed
actionEmitter.on(IRACTION.ALERT.SCAN.RESUMED, () => {
	change_iraction_button_to_pause();
});

// IR-SEVI image has started (during an action scan)
actionEmitter.on(IRACTION.ALERT.SEVI.STARTED, () => {
	enable_iraction_save_continue_button();
	enable_iraction_reset_image_button();
	enable_iraction_remeasure_button();
});

// IR-SEVI image has stopped (during an action scan)
actionEmitter.on(IRACTION.ALERT.SEVI.STOPPED, () => {
	disable_iraction_save_continue_button();
	disable_iraction_reset_image_button();
	disable_iraction_remeasure_button();
});

// Excitation remeasuring has started
actionEmitter.on(IRACTION.ALERT.REMEASURING.STARTED, () => {
	disable_iraction_remeasure_button();
});

// Excitation remeasuring has stopped
actionEmitter.on(IRACTION.ALERT.REMEASURING.STOPPED, () => {
	enable_iraction_remeasure_button();
});

/****
		Functions
****/

// Change IR Action Start/Save button to Start
function change_iraction_button_to_start() {
	const start_button_text = document.getElementById("IRActionScanStartSaveText");
	start_button_text.innerText = "Start";
}

// Change IR Action Start/Save button to Save
function change_iraction_button_to_save() {
	const start_button_text = document.getElementById("IRActionScanStartSaveText");
	start_button_text.innerText = "Save";
}

// Change IR Action Pause/Resume button to Pause
function change_iraction_button_to_pause() {
	const pause_button_text = document.getElementById("IRActionScanPauseResumeText");
	pause_button_text.innerText = "Pause";
}

// Change IR Action Pause/Resume button to Resume
function change_iraction_button_to_resume() {
	const pause_button_text = document.getElementById("IRActionScanPauseResumeText");
	pause_button_text.innerText = "Resume";
}

// Disable IR Action Pause/Resume button
function disable_iraction_pause_button() {
	const pause_button = document.getElementById("IRActionScanPauseResume");
	pause_button.disabled = true;
}

// Enable IR Action Pause/Resume button
function enable_iraction_pause_button() {
	const pause_button = document.getElementById("IRActionScanPauseResume");
	pause_button.disabled = false;
}

// Disable IR Action Cancel button
function disable_iraction_cancel_button() {
	const cancel_button = document.getElementById("IRActionScanCancel");
	cancel_button.disabled = true;
}

// Enable IR Action Cancel button
function enable_iraction_cancel_button() {
	const cancel_button = document.getElementById("IRActionScanCancel");
	cancel_button.disabled = false;
}

// Disable IR Action Save & Continue button
function disable_iraction_save_continue_button() {
	const save_continue_button = document.getElementById("IRActionImageSave");
	save_continue_button.disabled = true;
}

// Enable IR Action Save & Continue button
function enable_iraction_save_continue_button() {
	const save_continue_button = document.getElementById("IRActionImageSave");
	save_continue_button.disabled = false;
}

// Disable IR Action Reset Image button
function disable_iraction_reset_image_button() {
	const reset_image_button = document.getElementById("IRActionImageReset");
	reset_image_button.disabled = true;
}

// Enable IR Action Reset Image button
function enable_iraction_reset_image_button() {
	const reset_image_button = document.getElementById("IRActionImageReset");
	reset_image_button.disabled = false;
}

// Disable IR Action Remeasure Wavelength button
function disable_iraction_remeasure_button() {
	const remeasure_button = document.getElementById("IRActionRemeasureWavelength");
	remeasure_button.disabled = true;
}

// Enable IR Action Remeasure Wavelength button
function enable_iraction_remeasure_button() {
	const remeasure_button = document.getElementById("IRActionRemeasureWavelength");
	remeasure_button.disabled = false;
}

/*****************************************************************************

							SCAN OPTIONS

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRActionVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("IRActionVMIMode");
	uiEmitter.emit(UI.UPDATE.VMI.INDEX, vmi_mode.selectedIndex);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.VMI, update_iraction_vmi);

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.AUTOSTOP.PARAMETERS, update_iraction_autostop);

/****
		Functions
****/

function update_iraction_options() {
	// Options sent to ActionManager:
	// initial energy, final energy, step size, images per step
	// Options sent to ImageManager:
	// Autostop
	const initial_energy_input = document.getElementById("IRActionInitialEnergy");
	const final_energy_input = document.getElementById("IRActionFinalEnergy");
	const step_size_input = document.getElementById("IRActionEnergyStep");
	const autostop_input = document.getElementById("IRActionAutomaticStop");
	const autostop_unit_input = document.getElementById("IRActionAutomaticStopUnit");
	const images_per_step_input = document.getElementById("IRActionImageAmount");
	// Get values
	let initial_energy = parseFloat(initial_energy_input.value);
	let final_energy = parseFloat(final_energy_input.value);
	let step_size = parseFloat(step_size_input.value);
	let autostop = parseFloat(autostop_input.value);
	let autostop_unit = [SEVI.AUTOSTOP.METHOD.ELECTRONS, SEVI.AUTOSTOP.METHOD.FRAMES][autostop_unit_input.selectedIndex];
	// Images per step needs to be an integer
	let images_per_step = Math.round(images_per_step_input.value);
	images_per_step_input.value = images_per_step;
	// Make sure no options were blank
	let exit_function = false;
	if (isNaN(initial_energy) || isNaN(final_energy) || isNaN(step_size)) {
		msgEmitter.emit(MSG.ERROR, "IR Action energy values need to be specified");
		exit_function = true;
	}
	if (initial_energy <= 0 || final_energy <= 0) {
		msgEmitter.emit(MSG.ERROR, "IR Action energy values need to be positive");
		exit_function = true;
	}
	if (isNaN(autostop) || autostop_unit === undefined) {
		msgEmitter.emit(MSG.ERROR, "IR Action automatic stop values need to be specified");
		exit_function = true;
	}
	if (images_per_step <= 0) {
		msgEmitter.emit(MSG.ERROR, "IR Action - images per step must be a positive integer");
		exit_function = true;
	}
	if (exit_function) return false;

	// All values check out - send to respective managers
	let action_options = { initial_energy: initial_energy, final_energy: final_energy, step_size: step_size, images_per_step: images_per_step };
	actionEmitter.emit(IRACTION.UPDATE.OPTIONS, action_options);
	seviEmitter.emit(SEVI.UPDATE.AUTOSTOP, { value: autostop, method: autostop_unit });
	return true;
}

function update_iraction_autostop(autostop_params) {
	const autostop_value = document.getElementById("IRActionAutomaticStop");
	const autostop_unit = document.getElementById("IRActionAutomaticStopUnit");
	if (autostop_params.value === Infinity) autostop_value.value = "";
	else autostop_value.value = autostop_params.value;
	switch (autostop_params.method) {
		case SEVI.AUTOSTOP.METHOD.ELECTRONS:
			autostop_unit.selectedIndex = 0;
			break;
		case SEVI.AUTOSTOP.METHOD.FRAMES:
			autostop_unit.selectedIndex = 1;
			break;
		default:
			autostop_unit.selectedIndex = 0;
			break;
	}
}

function update_iraction_vmi(vmi_info) {
	const vmi_mode = document.getElementById("IRActionVMIMode");
	vmi_mode.selectedIndex = vmi_info.index;
}

/*****************************************************************************

							SCAN STATUS

*****************************************************************************/

/****
		HTML Element Listeners
****/

/****
		UI Event Listeners
****/

/****
		IR Action Event Listeners
****/

actionEmitter.on(IRACTION.ALERT.SEVI.STARTED, () => {
	update_iraction_status_current_step("Collecting IR-SEVI Image");
});
actionEmitter.on(IRACTION.ALERT.SEVI.STOPPED, () => {
	update_iraction_status_current_step(); // Clear status message
});
actionEmitter.on(IRACTION.ALERT.GOTO.STARTED, () => {
	update_iraction_status_current_step("Moving OPO Wavelength");
});
actionEmitter.on(IRACTION.ALERT.GOTO.STOPPED, () => {
	update_iraction_status_current_step(); // Clear status message
});
actionEmitter.on(IRACTION.ALERT.SCAN.STOPPED, () => {
	update_iraction_status_image_amount(); // Clear status message
	hide_iraction_status_current_energy();
	hide_iraction_status_next_energy();
	update_iraction_status_current_step("Action Scan Completed");
});

actionEmitter.on(IRACTION.RESPONSE.IMAGEAMOUNT, update_iraction_status_image_amount);
actionEmitter.on(IRACTION.RESPONSE.ENERGY.CURRENT, update_iraction_status_current_energy);
actionEmitter.on(IRACTION.RESPONSE.ENERGY.NEXT, update_iraction_status_next_energy);
actionEmitter.on(IRACTION.RESPONSE.DURATION, update_iraction_status_duration);

// Excitation remeasuring has started
actionEmitter.on(IRACTION.ALERT.REMEASURING.STARTED, () => {
	update_iraction_status_current_step("Remeasuring OPO Wavelength");
});

// Excitation remeasuring has stopped
actionEmitter.on(IRACTION.ALERT.REMEASURING.STOPPED, () => {
	update_iraction_status_current_step("Collecting IR-SEVI Image");
});

/****
		Functions
****/

function flash_iraction_status_label(label_id) {
	const label = document.getElementById(label_id);
	if (label) {
		label.style.color = "blue";
		setTimeout(() => {
			label.style.color = "white";
		}, 200);
	}
}

/**
 * Update the "Current Image" portion of the status section
 * @param {Object} image_amount_info : {current_image_id: (number), current_image_number: (number), total_image_number: (number)}
 */
function update_iraction_status_image_amount(image_amount_info) {
	const current_image = document.getElementById("IRActionStatusCurrentImageValues");
	if (!image_amount_info) {
		// Clear display
		current_image.innerText = "";
		return;
	}
	// Stringify the ID
	let id_string;
	if (image_amount_info.current_image_id < 10) id_string = `i0${image_amount_info.current_image_id}`;
	else id_string = `i${image_amount_info.current_image_id}`;
	// Stringify image progress
	let image_progress = `${image_amount_info.current_image_number} of ${image_amount_info.total_image_number}`;
	// Put it all together
	let current_image_string = `${id_string} (${image_progress})`;
	// Update text on UI
	current_image.innerText = current_image_string;
	// Flash label as notification of change
	flash_iraction_status_label("IRActionStatusCurrentImageLabel");
}

/**
 * Update the current IR energy portion of the status section
 * @param {ExcitationWavelength} excitation_wavelength
 */
function update_iraction_status_current_energy(excitation_wavelength) {
	const nir_wavelength = document.getElementById("IRActionCurrentWavelength");
	const ir_mode = document.getElementById("IRActionStatusCurrentEnergyIRLabel");
	const ir_wavenumber = document.getElementById("IRActionCurrentWavenumber");
	if (excitation_wavelength) {
		if (excitation_wavelength.nIR.wavelength > 0) {
			nir_wavelength.value = excitation_wavelength.nIR.wavelength.toFixed(3);
			ir_wavenumber.value = excitation_wavelength.energy.wavenumber.toFixed(3);
			let ir_mode_string = "";
			switch (excitation_wavelength.selected_mode) {
				case LASER.MODE.EXCITATION.NIR:
					ir_mode_string = "nIR";
					break;
				case LASER.MODE.EXCITATION.IIR:
					ir_mode_string = "iIR";
					break;
				case LASER.MODE.EXCITATION.MIR:
					ir_mode_string = "mIR";
					break;
				case LASER.MODE.EXCITATION.FIR:
					ir_mode_string = "fIR";
					break;
			}
			ir_mode.innerText = ir_mode_string;
		} else {
			nir_wavelength.value = "";
			ir_wavenumber.value = "";
			ir_mode.innerText = "";
		}
		show_iraction_status_current_energy();
		// Flash label as notification of change
		flash_iraction_status_label("IRActionStatusCurrentEnergyLabel");
	} else {
		hide_iraction_status_current_energy();
	}
}

function hide_iraction_status_current_energy() {
	const elements = [
		"IRActionStatusCurrentEnergyNIRLabel",
		"IRActionCurrentWavelength",
		"IRActionStatusNMLabel1",
		"IRActionStatusArrow1",
		"IRActionStatusCurrentEnergyIRLabel",
		"IRActionCurrentWavenumber",
		"IRActionStatusWNLabel1",
	];
	for (let e of elements) {
		document.getElementById(e).hidden = true;
	}
}

function show_iraction_status_current_energy() {
	const elements = [
		"IRActionStatusCurrentEnergyNIRLabel",
		"IRActionCurrentWavelength",
		"IRActionStatusNMLabel1",
		"IRActionStatusArrow1",
		"IRActionStatusCurrentEnergyIRLabel",
		"IRActionCurrentWavenumber",
		"IRActionStatusWNLabel1",
	];
	for (let e of elements) {
		document.getElementById(e).hidden = false;
	}
}

/**
 * Update the next IR energy portion of the status section
 * @param {ExcitationWavelength} excitation_wavelength
 */
function update_iraction_status_next_energy(excitation_wavelength) {
	const nir_wavelength = document.getElementById("IRActionNextWavelength");
	const ir_mode = document.getElementById("IRActionStatusNextEnergyIRLabel");
	const ir_wavenumber = document.getElementById("IRActionNextWavenumber");
	if (excitation_wavelength) {
		if (excitation_wavelength.nIR.wavelength > 0) {
			nir_wavelength.value = excitation_wavelength.nIR.wavelength.toFixed(3);
			ir_wavenumber.value = excitation_wavelength.energy.wavenumber.toFixed(3);
			let ir_mode_string = "";
			switch (excitation_wavelength.selected_mode) {
				case LASER.MODE.EXCITATION.NIR:
					ir_mode_string = "nIR";
					break;
				case LASER.MODE.EXCITATION.IIR:
					ir_mode_string = "iIR";
					break;
				case LASER.MODE.EXCITATION.MIR:
					ir_mode_string = "mIR";
					break;
				case LASER.MODE.EXCITATION.FIR:
					ir_mode_string = "fIR";
					break;
			}
			ir_mode.innerText = ir_mode_string;
		} else {
			nir_wavelength.value = "";
			ir_wavenumber.value = "";
			ir_mode.innerText = "";
		}
		show_iraction_status_next_energy();
		// Flash label as notification of change
		flash_iraction_status_label("IRActionStatusNextEnergyLabel");
	} else {
		hide_iraction_status_next_energy();
	}
}

function hide_iraction_status_next_energy() {
	const elements = [
		"IRActionStatusNextEnergyNIRLabel",
		"IRActionNextWavelength",
		"IRActionStatusNMLabel2",
		"IRActionStatusArrow2",
		"IRActionStatusNextEnergyIRLabel",
		"IRActionNextWavenumber",
		"IRActionStatusWNLabel2",
	];
	for (let e of elements) {
		document.getElementById(e).hidden = true;
	}
}

function show_iraction_status_next_energy() {
	const elements = [
		"IRActionStatusNextEnergyNIRLabel",
		"IRActionNextWavelength",
		"IRActionStatusNMLabel2",
		"IRActionStatusArrow2",
		"IRActionStatusNextEnergyIRLabel",
		"IRActionNextWavenumber",
		"IRActionStatusWNLabel2",
	];
	for (let e of elements) {
		document.getElementById(e).hidden = false;
	}
}

/**
 * Update the action scan duration status
 * @param {array} duration current duration of action scan as [ms, s, min, hr]
 */
function update_iraction_status_duration(duration) {
	const duration_value = document.getElementById("IRActionStatusScanDurationValues");
	let [ms, seconds, minutes, hours] = duration;
	let duration_text = "";
	if (seconds === 1) duration_text = "1 second";
	else if (seconds > 1) duration_text = `${seconds} seconds`;
	if (minutes === 1) duration_text = "1 minute " + duration_text;
	else if (minutes > 1) duration_text = `${minutes} minutes ` + duration_text;
	if (hours === 1) duration_text = "1 hour " + duration_text;
	else if (hours > 1) duration_text = `${hours} hours ` + duration_text;
	duration_value.innerText = duration_text;
	// Flash label as notification of change
	flash_iraction_status_label("IRActionStatusScanDurationLabel");
}

function update_iraction_status_current_step(message) {
	const current_step = document.getElementById("IRActionStatusCurrentStepValues");
	if (message) current_step.innerText = message;
	else current_step.innerText = "";
	// Flash label as notification of change
	flash_iraction_status_label("IRActionStatusCurrentStepLabel");
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRActionImageDisplaySelect").oninput = function () {
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
	uiEmitter.emit(UI.UPDATE.DISPLAY.SELECTEDINDEX, image_display_select.selectedIndex);
	update_iraction_accumulated_image_display();
};

document.getElementById("IRActionDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("IRActionDisplaySlider");
	uiEmitter.emit(UI.UPDATE.DISPLAY.SLIDERVALUE, display_slider.value);
	// Update image display
	update_iraction_accumulated_image_display();
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
	// We only want to update the image on a new camera frame if
	// (a) the user is on the IR-SEVI tab AND
	// (b) an image is currently being run AND
	// (c) that image is not currently paused
	let current_tab = once(uiEmitter, UI.RESPONSE.CURRENTTAB); // (a)
	let image_running = once(seviEmitter, SEVI.RESPONSE.SCAN.RUNNING); // (b)
	let image_paused = once(seviEmitter, SEVI.RESPONSE.SCAN.PAUSED); // (c)
	// Send query requests
	uiEmitter.emit(UI.QUERY.CURRENTTAB);
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
	seviEmitter.emit(SEVI.QUERY.SCAN.PAUSED);
	// Wait for messages to be received (for promises to be resolved)
	// and replace variables with the returned values from each message
	[[current_tab], [image_running], [image_paused]] = await Promise.all([current_tab, image_running, image_paused]);
	// Make sure all values are correct
	if (current_tab !== UI.TAB.IRACTION) return;
	if (!image_running) return;
	if (image_paused) return;
	// If everything passed, update display
	update_iraction_accumulated_image_display();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.DISPLAY.SELECTEDINDEX, (value) => {
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
	image_display_select.selectedIndex = value;
});

uiEmitter.on(UI.RESPONSE.DISPLAY.SLIDERVALUE, (value) => {
	const display_slider = document.getElementById("IRActionDisplaySlider");
	display_slider.value = value;
});

/****
		SEVI Event Listeners
****/

// Update accumulated image display when scan is reset
seviEmitter.on(SEVI.ALERT.SCAN.RESET, update_iraction_accumulated_image_display);

/****
		Functions
****/

function update_iraction_accumulated_image_display() {
	const image_display = document.getElementById("IRActionDisplay");
	const ctx = image_display.getContext("2d");
	const image_display_select = document.getElementById("IRActionImageDisplaySelect");
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

seviEmitter.on(SEVI.RESPONSE.COUNTS.TOTAL, update_iraction_counters);

seviEmitter.on(SEVI.RESPONSE.AUTOSTOP.PROGRESS, (progress) => {
	// Check if there is an action scan being taken or not
	// (set up listener with .once(), then ask if it's running with .emit() )
	actionEmitter.once(IRACTION.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) update_iraction_image_progress_bar(progress);
	});
	actionEmitter.emit(IRACTION.QUERY.SCAN.RUNNING);
});

// If an image is stopped (during an action scan), say the progress is at 100%
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	// Check if there is an action scan being taken or not
	// (set up listener with .once(), then ask if it's running with .emit() )
	actionEmitter.once(IRACTION.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) update_iraction_image_progress_bar(100);
	});
	actionEmitter.emit(IRACTION.QUERY.SCAN.RUNNING);
});

/****
		IR Action Event Listeners
****/

actionEmitter.on(IRACTION.ALERT.SCAN.STOPPED, update_iraction_image_progress_bar);

/****
		Functions
****/

function update_iraction_counters(counts) {
	// counts should look like Image.counts
	// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
	const total_frames_off = document.getElementById("IRActionTotalFrames");
	const total_frames_on = document.getElementById("IRActionTotalFramesIROn");
	const total_electrons_off = document.getElementById("IRActionTotalECount");
	const total_electrons_on = document.getElementById("IRActionTotalECountIROn");
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

function update_iraction_image_progress_bar(percent) {
	const progress_bar = document.getElementById("IRActionImageProgressBar");
	const percent_label = document.getElementById("IRActionImageProgressPercentLabel");
	// Move progress bar
	if (percent) {
		if (percent > 100) percent = 100;
		else if (percent < 0) percent = 0;
		progress_bar.style.left = `-${100 - percent}%`;
		percent_label.innerText = `${Math.round(percent)}%`;
	} else {
		progress_bar.style.left = "-100%";
		percent_label.innerText = "0%";
	}
}

/**************************/

function fill_iraction_options() {
	const initial_energy_input = document.getElementById("IRActionInitialEnergy");
	const final_energy_input = document.getElementById("IRActionFinalEnergy");
	const step_size_input = document.getElementById("IRActionEnergyStep");
	const autostop_input = document.getElementById("IRActionAutomaticStop");
	const autostop_unit_input = document.getElementById("IRActionAutomaticStopUnit");
	const images_per_step_input = document.getElementById("IRActionImageAmount");
	initial_energy_input.value = 1000;
	final_energy_input.value = 1010;
	step_size_input.value = 5;
	autostop_input.value = 0.1;
	autostop_unit_input.selectedIndex = 1;
	images_per_step_input.value = 1;
}
