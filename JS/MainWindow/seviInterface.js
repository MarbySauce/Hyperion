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

	uiEmitter.emit(UI.INFO.QUERY.IMAGEID);
	uiEmitter.emit(UI.INFO.QUERY.VMI);

	seviEmitter.emit(SEVI.QUERY.SCAN.FILENAME);

	seviEmitter.emit(SEVI.QUERY.COUNTS.TOTAL);
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
});
// When a scan is saved, change Start/Save to Start and Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
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
	// NOTE TO Marty: Need to add stuff for pause animation
});
// When a scan is canceled, change Start/Save to Start
// Change Pause/Resume to Resume
seviEmitter.on(SEVI.ALERT.SCAN.CANCELED, () => {
	change_sevi_button_to_start();
	change_sevi_button_to_resume();
});

/****
		Functions
****/

// Change SEVI Start/Save button to Start
function change_sevi_button_to_start() {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Start";
}

// Change SEVI Start/Save button to Save
function change_sevi_button_to_save() {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Save";
}

// Change SEVI Pause/Resume button to Pause
function change_sevi_button_to_pause() {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
}

// Change SEVI Pause/Resume button to Resume
function change_sevi_button_to_resume() {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Resume";
}

/*****************************************************************************

							FILE NAMING

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviImageCounterUp").onclick = function () {
	uiEmitter.emit(UI.CHANGE.IMAGEID.INCREASE);
};
document.getElementById("SeviImageCounterDown").onclick = function () {
	uiEmitter.emit(UI.CHANGE.IMAGEID.DECREASE);
};
document.getElementById("SeviVMIMode").oninput = function () {
	const vmi_mode = document.getElementById("SeviVMIMode");
	uiEmitter.emit(UI.CHANGE.VMI.INDEX, vmi_mode.selectedIndex);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.INFO.RESPONSE.IMAGEID, update_sevi_image_id);
uiEmitter.on(UI.INFO.RESPONSE.VMI, update_sevi_vmi);

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

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("SeviDisplaySlider");
	uiEmitter.emit(UI.CHANGE.DISPLAYSLIDERVALUE, display_slider.value);
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, () => {
	update_sevi_accumulated_image_display();
});

/****
		UI Event Listeners
****/

uiEmitter.on(UI.INFO.RESPONSE.DISPLAYSLIDERVALUE, (value) => {
	const display_slider = document.getElementById("SeviDisplaySlider");
	display_slider.value = value;
});

/****
		SEVI Event Listeners
****/

/****
		Functions
****/

function update_sevi_accumulated_image_display() {
	const image_display = document.getElementById("SeviDisplay");
	const ctx = image_display.getContext("2d");
	seviEmitter.once(SEVI.RESPONSE.IMAGE, (image_data) => {
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

/****
		UI Event Listeners
****/

/****
		SEVI Event Listeners
****/

seviEmitter.on(SEVI.RESPONSE.COUNTS.TOTAL, update_sevi_counters);

/****
		Functions
****/

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
