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
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
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
	// This won't be too easy to get working, saving for later
	//	TODO
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
