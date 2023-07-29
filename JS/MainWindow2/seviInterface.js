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
		Image Manager Listeners
****/

/****
		Functions
****/

// Doing this so my IDE can get the class information
// Couldn't figure out a better way to do it
try {
	const { ImageManagerMessenger } = require("./Libraries/ImageManager.js");
} catch (error) {
	const { ImageManagerMessenger } = require("../JS/MainWindow2/Libraries/ImageManager.js");
}
const IMMessenger_sevi = new ImageManagerMessenger();

/*****************************************************************************

							PAGE CONTROL

*****************************************************************************/

//uiEmitter.on(UI.LOAD.SEVI, load_sevi_info);

function load_sevi_info() {
	// Information to load:
	//		Image ID
	//		VMI Info
	//		Laser Info
	//		Accumulated Image
	//		Electron Info
	//		PES Display
	//uiEmitter.emit(UI.QUERY.IMAGEID);
	//uiEmitter.emit(UI.QUERY.VMI);
	//seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);
	//seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);

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
	if (IMMessenger_sevi.information.status.stopped) IMMessenger_sevi.request.scan.start();
	else IMMessenger_sevi.request.scan.stop();
};
document.getElementById("SeviScanPauseResume").onclick = function () {
	if (IMMessenger_sevi.information.status.running) IMMessenger_sevi.request.scan.pause();
	else IMMessenger_sevi.request.scan.resume(true);
};
document.getElementById("SeviScanCancel").onclick = function () {
	IMMessenger_sevi.request.scan.cancel();
};
document.getElementById("SeviScanAutosave").onclick = function () {
	//autosave_button();
};
document.getElementById("SeviScanReset").onclick = function () {
	IMMessenger_sevi.request.scan.reset();
};
document.getElementById("SeviScanSingleShot").onclick = function () {
	// Single shot
};

document.getElementById("SeviImageSeries").oninput = function () {
	// Image series
};

/****
		Image Manager Listeners
****/

// Image has been started
IMMessenger_sevi.listen.event.scan.start.on(() => {
	change_sevi_button_to_save();
	change_sevi_button_to_pause();
	// Add scan-running class to controls section when a scan starts (used for image series collection)
	add_scan_running_to_sevi_controls();
});

// Image has been stopped
IMMessenger_sevi.listen.event.scan.stop.on(() => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
	// Remove scan-running class from controls section when a scan stops (used for image series collection)
	remove_scan_running_from_sevi_controls();
});

IMMessenger_sevi.listen.event.scan.pause.on(() => {
	change_sevi_button_to_resume();
});

IMMessenger_sevi.listen.event.scan.resume.on(() => {
	change_sevi_button_to_save();
	change_sevi_button_to_pause();
	// Add scan-running class to controls section when a scan starts (used for image series collection)
	add_scan_running_to_sevi_controls();
});

IMMessenger_sevi.listen.event.scan.cancel.on(() => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
	// Remove scan-running class from controls section when a scan stops (used for image series collection)
	remove_scan_running_from_sevi_controls();
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
	IMMessenger_sevi.update.id.increase();
};
document.getElementById("SeviImageCounterDown").onclick = function () {
	IMMessenger_sevi.update.id.decrease();
};
document.getElementById("SeviVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("SeviVMIMode");
	let index = vmi_mode.selectedIndex;
	IMMessenger_sevi.update.vmi_info({ index: index });
};

/****
		Image Manager Listeners
****/

IMMessenger_sevi.listen.info_update.image.id.on((id) => {
	update_sevi_image_id(id);
});

IMMessenger_sevi.listen.info_update.image.file_name.on((file_name) => {
	update_sevi_filename(file_name);
});

IMMessenger_sevi.listen.info_update.image.vmi_info.on((vmi_info) => {
	update_sevi_vmi(vmi_info);
});

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

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("SeviDisplaySlider");
	IMMessenger_sevi.update.image_contrast(display_slider.value);
	// Update image display
	update_sevi_accumulated_image_display();
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, async () => {
	// If user is not on SEVI tab, ignore
	if (PageInfo.current_tab !== UI.TAB.SEVI) return; // PageInfo is from interface.js
	// Only update display if image is being taken
	if (IMMessenger_sevi.information.status.running) {
		update_sevi_accumulated_image_display();
	}
});

/****
		Image Manager Listeners
****/

IMMessenger_sevi.listen.info_update.image_contrast.on((value) => {
	const display_slider = document.getElementById("SeviDisplaySlider");
	display_slider.value = value;
});

// Update accumulated image display when scan is reset
IMMessenger_sevi.listen.event.scan.reset.on(update_sevi_accumulated_image_display);

/****
		Functions
****/

function update_sevi_accumulated_image_display() {
	const image_display = document.getElementById("SeviDisplay");
	const ctx = image_display.getContext("2d");
	let image_data = IMMessenger_sevi.information.get_image_display(ImageType.IROFF);
	if (!image_data) return; // No ImageData object was sent
	// Clear the current image
	ctx.clearRect(0, 0, image_display.width, image_display.height);
	// Put image_data on the display
	// Have to convert the ImageData object into a bitmap image so that the  image is resized to fill the display correctly
	createImageBitmap(image_data).then(function (bitmap_img) {
		ctx.drawImage(bitmap_img, 0, 0, image_data.width, image_data.height, 0, 0, image_display.width, image_display.height);
	});
}

/*****************************************************************************

						ELECTRON/FRAME COUNTS

*****************************************************************************/

/****
		Image Manager Listeners
****/

IMMessenger_sevi.listen.info_update.image.counts.on(update_sevi_counters);

// Add scan-running class to counters section when a scan starts (used for image progress bar)
IMMessenger_sevi.listen.event.scan.start.on(() => {
	add_scan_running_to_sevi_counters();
	show_sevi_image_progress_bar();
});
IMMessenger_sevi.listen.event.scan.resume.on(() => {
	add_scan_running_to_sevi_counters();
	show_sevi_image_progress_bar();
});
// Remove scan-running class from counters section when a scan stops (used for image progress bar)
IMMessenger_sevi.listen.event.scan.stop.on(() => {
	remove_scan_running_from_sevi_counters();
	hide_sevi_image_progress_bar();
});
IMMessenger_sevi.listen.event.scan.cancel.on(() => {
	remove_scan_running_from_sevi_counters();
	hide_sevi_image_progress_bar();
});

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
	//seviEmitter.emit(SEVI.UPDATE.AUTOSTOP, { value: value });
}

function send_sevi_autostop_unit_update() {
	const autostop_unit = document.getElementById("SeviAutomaticStopUnit");
	const methods = [SEVI.AUTOSTOP.METHOD.NONE, SEVI.AUTOSTOP.METHOD.ELECTRONS, SEVI.AUTOSTOP.METHOD.FRAMES];
	let method = methods[autostop_unit.selectedIndex] || SEVI.AUTOSTOP.METHOD.NONE; // If selectedIndex is (somehow) out of range, send NONE as method
	//seviEmitter.emit(SEVI.UPDATE.AUTOSTOP, { method: method });
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
	//seviEmitter.once(SEVI.RESPONSE.SCAN.ISIR, (is_ir) => {
	//	if (!is_ir) show_bar = true;
	//});
	//seviEmitter.emit(SEVI.QUERY.SCAN.ISIR);
	// Only show the image progress bar if the autostop parameter is set (i.e. not "none")
	//seviEmitter.once(SEVI.RESPONSE.AUTOSTOP.PARAMETERS, (autostop_params) => {
	//	if (autostop_params.method === SEVI.AUTOSTOP.METHOD.NONE || autostop_params.value === Infinity) return; // Don't show progress bar
	//	if (!show_bar) return;
	//	const sevi_counters = document.getElementById("SeviCounters");
	//	sevi_counters.classList.remove("hide-progress-bar");
	//	sevi_counters.classList.add("show-progress-bar");
	//});
	//seviEmitter.emit(SEVI.QUERY.AUTOSTOP.PARAMETERS);
}

function hide_sevi_image_progress_bar() {
	const sevi_counters = document.getElementById("SeviCounters");
	sevi_counters.classList.remove("show-progress-bar");
	sevi_counters.classList.add("hide-progress-bar");
}
