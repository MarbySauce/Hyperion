/************************************************** 

			Control for SEVI UI elements

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

uiEmitter.on(UI.LOAD.SEVI, load_sevi_info);

function load_sevi_info() {
	// Information to load:
	//		Image ID
	//		VMI Info
	//		Laser Info
	//		Accumulated Image
	//		Electron Info
	//		PES Display

	uiEmitter.emit(UI.QUERY.IMAGEID);
	uiEmitter.emit(UI.QUERY.VMI);

	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);

	seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);

	const sevi_controls = document.getElementById("SeviScanControls");
	if (settings?.image_series.show_menu) sevi_controls.classList.remove("hide-image-series");
	else sevi_controls.classList.add("hide-image-series");
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
	// (set up listener with .once(), then ask if it's running with .emit() )
	seviEmitter.once(SEVI.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) {
			// A scan is currently running, request it be stopped
			seviEmitter.emit(SEVI.SCAN.STOP);
		} else {
			// Start a new SEVI scan
			seviEmitter.emit(SEVI.SCAN.START);
		}
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
};
document.getElementById("SeviScanPauseResume").onclick = function () {
	// Pause/Resume logic moved to sevi.js bc ImageManager should be figuring out what to do
	seviEmitter.emit(SEVI.SCAN.PAUSERESUME);
};
document.getElementById("SeviScanCancel").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.CANCEL);
};
document.getElementById("SeviScanAutosave").onclick = function () {
	//autosave_button();
};
document.getElementById("SeviScanReset").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.RESET);
};
document.getElementById("SeviScanSingleShot").onclick = function () {
	seviEmitter.emit(SEVI.SCAN.SINGLESHOT);
	msgEmitter.emit(MSG.ERROR, "Single Shot functionality not set up yet!");
};

document.getElementById("SeviImageSeries").oninput = function () {
	seviEmitter.emit(SEVI.UPDATE.SERIES.LENGTH, document.getElementById("SeviImageSeries").selectedIndex + 1);
};

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

// When new scan is started, change Start/Save to Save and Pause/Resume to Pause
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	change_sevi_button_to_save();
	change_sevi_button_to_pause();
	// Add scan-running class to controls section when a scan starts (used for image series collection)
	add_scan_running_to_sevi_controls();
});
// When a scan is saved, change Start/Save to Start and Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
	// Remove scan-running class from controls section when a scan stops (used for image series collection)
	remove_scan_running_from_sevi_controls();
});
// When a scan is paused, change Pause/Resume to Resume and add pause overlay
seviEmitter.on(SEVI.ALERT.SCAN.PAUSED, () => {
	change_sevi_button_to_resume();
	// NOTE TO Marty: Need to add stuff for pause animation
});
// When a scan is resumed, change Pause/Resume to Pause and remove pause overlay
// Change Start/Save to Save
seviEmitter.on(SEVI.ALERT.SCAN.RESUMED, () => {
	change_sevi_button_to_pause();
	change_sevi_button_to_save();
	// Add scan-running class to controls section when a scan starts (used for image series collection)
	add_scan_running_to_sevi_controls();
	// NOTE TO Marty: Need to add stuff for pause animation
});
// When a scan is canceled, change Start/Save to Start
// Change Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.CANCELED, () => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
	// Remove scan-running class from controls section when a scan stops (used for image series collection)
	remove_scan_running_from_sevi_controls();
});

seviEmitter.on(SEVI.RESPONSE.SERIES.LENGTH, (collection_length) => {
	document.getElementById("SeviImageSeries").selectedIndex = collection_length - 1;
});

seviEmitter.on(SEVI.RESPONSE.SERIES.REMAINING, (remaining) => {
	const remaining_text = document.getElementById("SeviImageSeriesRemainingText");
	remaining_text.innerText = `(${remaining})`;
});

/****
		Functions
****/

// Change SEVI Start/Save button to Start
function change_sevi_button_to_start() {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	start_button_text.innerText = "Start";
}

// Change SEVI Start/Save button to Save
function change_sevi_button_to_save() {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	start_button_text.innerText = "Save";
}

// Change SEVI Pause/Resume button to Pause
function change_sevi_button_to_pause() {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	pause_button_text.innerText = "Pause";
}

// Change SEVI Pause/Resume button to Resume
function change_sevi_button_to_resume() {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	pause_button_text.innerText = "Resume";
}

// Add "scan-running" class to controls section (used for image series collection)
function add_scan_running_to_sevi_controls() {
	const sevi_controls = document.getElementById("SeviScanControls");
	sevi_controls.classList.add("scan-running");
}

// Remove "scan-running" class from controls section (used for image series collection)
function remove_scan_running_from_sevi_controls() {
	const sevi_controls = document.getElementById("SeviScanControls");
	sevi_controls.classList.remove("scan-running");
}

/*****************************************************************************

							FILE NAMING

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviImageCounterUp").onclick = function () {
	uiEmitter.emit(UI.UPDATE.IMAGEID.INCREASE);
};
document.getElementById("SeviImageCounterDown").onclick = function () {
	uiEmitter.emit(UI.UPDATE.IMAGEID.DECREASE);
};
document.getElementById("SeviVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("SeviVMIMode");
	uiEmitter.emit(UI.UPDATE.VMI.INDEX, vmi_mode.selectedIndex);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.IMAGEID, update_sevi_image_id);
uiEmitter.on(UI.RESPONSE.VMI, update_sevi_vmi);

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.SCAN.FILENAME, update_sevi_filename);

/****
		Functions
****/

function update_sevi_image_id(image_id) {
	const image_counter = document.getElementById("SeviImageCounter");
	image_counter.value = image_id;
}

function update_sevi_filename(filename) {
	const sevi_filename = document.getElementById("SeviCurrentImageFile");
	sevi_filename.value = filename;
}

function update_sevi_vmi(vmi_info) {
	const vmi_mode = document.getElementById("SeviVMIMode");
	vmi_mode.selectedIndex = vmi_info.index;
}

/*****************************************************************************

							LASER CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviWavelengthMode").oninput = function () {
	update_sevi_detachment_mode();
};

document.getElementById("SeviMeasureDetachmentWavelength").onclick = function () {
	laserEmitter.emit(LASER.MEASURE.DETACHMENT);
};

document.getElementById("SeviMeasureDetachmentWavelengthCancel").onclick = function () {
	laserEmitter.emit(LASER.MEASURE.CANCEL.DETACHMENT);
};

// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
// (that way it doesn't execute for each character inputted)

const update_sevi_detachment_wavelength_delay = new InputDelay(update_sevi_detachment_wavelength);
document.getElementById("SeviDetachmentWavelength").oninput = function () {
	update_sevi_detachment_wavelength_delay.start_timer();
};

/****
		UI Event Listeners
****/

/****
		Laser Event Listeners
****/

laserEmitter.on(LASER.RESPONSE.DETACHMENT.INFO, update_sevi_detachment_energies);

laserEmitter.on(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STARTED, () => {
	// Disable measure button and show cancel measurement button
	const measure_button = document.getElementById("SeviMeasureDetachmentWavelength");
	const cancel_button = document.getElementById("SeviMeasureDetachmentWavelengthCancel");
	measure_button.disabled = true;
	cancel_button.classList.remove("hidden");
});

laserEmitter.on(LASER.ALERT.WAVEMETER.MEASURING.DETACHMENT.STOPPED, () => {
	// Re-enable measure button and hide cancel measurement button
	const measure_button = document.getElementById("SeviMeasureDetachmentWavelength");
	const cancel_button = document.getElementById("SeviMeasureDetachmentWavelengthCancel");
	measure_button.disabled = false;
	cancel_button.classList.add("hidden");
});

/****
		Functions
****/

function update_sevi_detachment_wavelength() {
	const detachment_wavelength = document.getElementById("SeviDetachmentWavelength");
	laserEmitter.emit(LASER.UPDATE.DETACHMENT.STANDARDWL, parseFloat(detachment_wavelength.value));
}

function update_sevi_detachment_mode() {
	const detachment_mode = document.getElementById("SeviWavelengthMode");
	const mode_list = [LASER.MODE.DETACHMENT.STANDARD, LASER.MODE.DETACHMENT.DOUBLED, LASER.MODE.DETACHMENT.RAMAN, LASER.MODE.DETACHMENT.IRDFG];
	laserEmitter.emit(LASER.UPDATE.DETACHMENT.MODE, mode_list[detachment_mode.selectedIndex]);
}

function update_sevi_detachment_energies(detachment_wl_class) {
	const input_wavelength = document.getElementById("SeviDetachmentWavelength");
	const converted_wavelength = document.getElementById("SeviConvertedWavelength");
	const converted_wavenumber = document.getElementById("SeviDetachmentWavenumber");
	const detachment_mode = document.getElementById("SeviWavelengthMode");
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

	// Update the input box too (in case the values were changed on the IR-SEVI tab)
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
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("SeviDisplaySlider");
	uiEmitter.emit(UI.UPDATE.DISPLAY.SLIDERVALUE, display_slider.value);
	// Update image display
	update_sevi_accumulated_image_display();
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
	// We only want to update the image on a new camera frame if
	// (a) the user is on the SEVI tab AND
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
	if (current_tab !== UI.TAB.SEVI) return;
	if (!image_running) return;
	if (image_paused) return;
	// If everything passed, update display
	update_sevi_accumulated_image_display();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.RESPONSE.DISPLAY.SLIDERVALUE, (value) => {
	const display_slider = document.getElementById("SeviDisplaySlider");
	display_slider.value = value;
});

/****
		SEVI Event Listeners
****/

// Update accumulated image display when scan is reset
seviEmitter.on(SEVI.ALERT.SCAN.RESET, update_sevi_accumulated_image_display);

/****
		Functions
****/

function update_sevi_accumulated_image_display() {
	const image_display = document.getElementById("SeviDisplay");
	const ctx = image_display.getContext("2d");
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
	seviEmitter.emit(SEVI.QUERY.IMAGE.IROFF);
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

/****
		HTML Element Listeners
****/

// If Image progress bar is shown (scan is running and autostop parameters set)
// when user hovers mouse over counters section, autostop input section should be shown (so they can change it)
document.getElementById("SeviCounters").onmouseenter = function () {
	hide_sevi_image_progress_bar();
};
document.getElementById("SeviCounters").onmouseleave = function () {
	send_sevi_autostop_value_update(); // In case user updated autostop value while mouse hovering over box
	show_sevi_image_progress_bar();
};

// Putting timers on typed inputs so that the functions are only run if the user hasn't updated the input in the last second
// (that way it doesn't execute for each character inputted)
const send_sevi_autostop_value_update_delay = new InputDelay(send_sevi_autostop_value_update);
document.getElementById("SeviAutomaticStop").oninput = function () {
	send_sevi_autostop_value_update_delay.start_timer();
};

document.getElementById("SeviAutomaticStopUnit").oninput = function () {
	send_sevi_autostop_unit_update();
};

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.COUNTS.TOTAL, update_sevi_counters);

seviEmitter.on(SEVI.RESPONSE.AUTOSTOP.PARAMETERS, update_sevi_autostop);

// Add scan-running class to counters section when a scan starts (used for image progress bar)
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	add_scan_running_to_sevi_counters();
	show_sevi_image_progress_bar();
});
seviEmitter.on(SEVI.ALERT.SCAN.RESUMED, () => {
	add_scan_running_to_sevi_counters();
	show_sevi_image_progress_bar();
});
// Remove scan-running class from counters section when a scan stops (used for image progress bar)
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	remove_scan_running_from_sevi_counters();
	hide_sevi_image_progress_bar();
});
seviEmitter.on(SEVI.ALERT.SCAN.CANCELED, () => {
	remove_scan_running_from_sevi_counters();
	hide_sevi_image_progress_bar();
});

seviEmitter.on(SEVI.RESPONSE.AUTOSTOP.PROGRESS, update_sevi_image_progress_bar);

/****
		Functions
****/

// Add "scan-running" class to counters section (used for image progress bar)
function add_scan_running_to_sevi_counters() {
	const sevi_counters = document.getElementById("SeviCounters");
	sevi_counters.classList.add("scan-running");
}

// Remove "scan-running" class from counters section (used for image progress bar)
function remove_scan_running_from_sevi_counters() {
	const sevi_counters = document.getElementById("SeviCounters");
	sevi_counters.classList.remove("scan-running");
}

function update_sevi_counters(counts) {
	// counts should look like Image.counts
	// (i.e. counts = { electrons: { on: 0, off: 0, total: 0 }, frames: { on: 0, off: 0, total: 0 } }
	const total_frames = document.getElementById("SeviTotalFrames");
	const total_electrons = document.getElementById("SeviTotalECount");
	let formatted_electrons;
	if (counts.electrons.total > 10000) {
		formatted_electrons = counts.electrons.total.toExponential(3);
	} else {
		formatted_electrons = counts.electrons.total.toString();
	}

	total_frames.value = counts.frames.total;
	total_electrons.value = formatted_electrons;
}

function send_sevi_autostop_value_update() {
	const autostop_value = document.getElementById("SeviAutomaticStop");
	let value = autostop_value.value;
	seviEmitter.emit(SEVI.UPDATE.AUTOSTOP, { value: value });
}

function send_sevi_autostop_unit_update() {
	const autostop_unit = document.getElementById("SeviAutomaticStopUnit");
	const methods = [SEVI.AUTOSTOP.METHOD.NONE, SEVI.AUTOSTOP.METHOD.ELECTRONS, SEVI.AUTOSTOP.METHOD.FRAMES];
	let method = methods[autostop_unit.selectedIndex] || SEVI.AUTOSTOP.METHOD.NONE; // If selectedIndex is (somehow) out of range, send NONE as method
	seviEmitter.emit(SEVI.UPDATE.AUTOSTOP, { method: method });
}

function update_sevi_autostop(autostop_params) {
	const autostop_value = document.getElementById("SeviAutomaticStop");
	const autostop_unit = document.getElementById("SeviAutomaticStopUnit");
	if (autostop_params.value === Infinity) autostop_value.value = "";
	else autostop_value.value = autostop_params.value;
	switch (autostop_params.method) {
		case SEVI.AUTOSTOP.METHOD.NONE:
			autostop_unit.selectedIndex = 0;
			break;
		case SEVI.AUTOSTOP.METHOD.ELECTRONS:
			autostop_unit.selectedIndex = 1;
			break;
		case SEVI.AUTOSTOP.METHOD.FRAMES:
			autostop_unit.selectedIndex = 2;
			break;
		default:
			autostop_unit.selectedIndex = 0;
			break;
	}
}

function update_sevi_image_progress_bar(percent) {
	const progress_bar = document.getElementById("SeviImageProgressBar");
	const percent_label = document.getElementById("SeviImageProgressPercentLabel");
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

function show_sevi_image_progress_bar() {
	// Only show the image progress bar if the current scan is an IR-SEVI scan
	let show_bar = false;
	seviEmitter.once(SEVI.RESPONSE.SCAN.ISIR, (is_ir) => {
		if (!is_ir) show_bar = true;
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.ISIR);
	// Only show the image progress bar if the autostop parameter is set (i.e. not "none")
	seviEmitter.once(SEVI.RESPONSE.AUTOSTOP.PARAMETERS, (autostop_params) => {
		if (autostop_params.method === SEVI.AUTOSTOP.METHOD.NONE || autostop_params.value === Infinity) return; // Don't show progress bar
		if (!show_bar) return;
		const sevi_counters = document.getElementById("SeviCounters");
		sevi_counters.classList.remove("hide-progress-bar");
		sevi_counters.classList.add("show-progress-bar");
	});
	seviEmitter.emit(SEVI.QUERY.AUTOSTOP.PARAMETERS);
}

function hide_sevi_image_progress_bar() {
	const sevi_counters = document.getElementById("SeviCounters");
	sevi_counters.classList.remove("show-progress-bar");
	sevi_counters.classList.add("hide-progress-bar");
}
