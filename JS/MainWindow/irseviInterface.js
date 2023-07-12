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
}

/*****************************************************************************

							SCAN CONTROL

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("IRSeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
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
	// This won't be too easy to get working, saving for later
	//	TODO
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
