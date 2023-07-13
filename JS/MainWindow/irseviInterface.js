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

						ACCUMULATED IMAGE DISPLAY

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviDisplaySlider").oninput = function () {
	const display_slider = document.getElementById("IRSeviDisplaySlider");
	uiEmitter.emit(UI.CHANGE.DISPLAYSLIDERVALUE, display_slider.value);
};

/****
		IPC Event Listeners
****/

ipc.on(IPCMessages.UPDATE.NEWFRAME, () => {
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

/****
		Functions
****/

function update_irsevi_accumulated_image_display() {
	const image_display = document.getElementById("IRSeviDisplay");
	const ctx = image_display.getContext("2d");
	const image_display_select = document.getElementById("IRSeviImageDisplaySelect");
	seviEmitter.once(SEVI.RESPONSE.IMAGE, (image_data) => {
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
