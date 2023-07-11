/************************************************** 

			Control for all UI elements

**************************************************/

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, UI.TAB.SEVI);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, UI.TAB.IRSEVI);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	uiEmitter.emit(UI.CHANGE.TAB, UI.TAB.IRACTION);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	uiEmitter.emit(UI.CHANGE.TAB, UI.TAB.SETTINGS);
};

/*		Sevi Mode		*/

// Scan control buttons
document.getElementById("SeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
	seviEmitter.once(SEVI.RESPONSE.SCAN.RUNNING, (is_running) => {
		if (is_running) {
			// A scan is currently running, request it be stopped
			seviEmitter.emit(SEVI.SCAN.STOP);
		} else {
			// Start a new scan
			seviEmitter.emit(SEVI.SCAN.START);
		}
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);
};
// Change button from start to save when scan is started
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	uiEmitter.emit(UI.CHANGE.SEVI.SAVE);
});
// Change button from save to start when scan is stopped
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	uiEmitter.emit(UI.CHANGE.SEVI.START);
});

let bs_counter = 0;
document.getElementById("SeviScanPauseResume").onclick = function () {
	// This won't be too easy to get working, saving for later
	//	TODO
	bs_counter++;
	msgEmitter.emit(MSG.UPDATE, `This is message #${bs_counter}`);
};
let bs_counter_2 = 0;
document.getElementById("SeviScanCancel").onclick = function () {
	//seviEmitter.emit(SEVI.SCAN.CANCEL);
	bs_counter_2++;
	msgEmitter.emit(MSG.ERROR, `This is error #${bs_counter_2}`);
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

/* 		uiEmitter Event Listeners		*/

// Changing tabs
uiEmitter.on(UI.CHANGE.TAB, (tab) => {
	// Add functionality for tab switching
	console.log(`Changing tab to ${tab}`);

	// Depress the current tab and hide content
	let current_tab = document.getElementById(page_info.current_tab);
	let current_page = document.getElementById(page_info.current_tab + "Content");
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Activate selected tab and show content
	let new_tab = document.getElementById(tab);
	let new_page = document.getElementById(tab + "Content");
	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) new_page.style.display = "grid";
});

// Change SEVI Start/Save button to Start
uiEmitter.on(UI.CHANGE.SEVI.START, () => {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Start";
});

// Change SEVI Start/Save button to Save
uiEmitter.on(UI.CHANGE.SEVI.SAVE, () => {
	const start_button_text = document.getElementById("SeviScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Save";
});

// Change SEVI Pause/Resume button to Resume
uiEmitter.on(UI.CHANGE.SEVI.RESUME, () => {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Resume";
});

// Change SEVI Pause/Resume button to Pause
uiEmitter.on(UI.CHANGE.SEVI.PAUSE, () => {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
});

// Return requested current ID value
uiEmitter.on(UI.INFO.QUERY.IMAGEID, send_image_id_info);

uiEmitter.on(UI.INFO.QUERY.VMIINFO, send_vmi_info);

// When new scan is started, change Start/Save to Save and Pause/Resume to Pause
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	uiEmitter.emit(UI.CHANGE.SEVI.SAVE);
	uiEmitter.emit(UI.CHANGE.SEVI.PAUSE);
});

/*****************************************************************************

						UI RELATED FUNCTIONS

*****************************************************************************/

function send_image_id_info() {
	const image_counter = document.getElementById("SeviImageCounter");
	let current_counter_val;
	if (image_counter) {
		current_counter_val = parseInt(image_counter.value);
		uiEmitter.emit(UI.INFO.RESPONSE.IMAGEID, current_counter_val);
	}
}

function send_vmi_info() {
	const vmi_mode_selection = document.getElementById("SeviVMIMode");
	if (vmi_mode_selection) {
		let vmi_mode = `V${vmi_mode_selection.selectedIndex + 1}`;
		// VMI mode will be "V" + selected index + 1 (e.g. option 0 == V1)
		let vmi_info = {
			mode: vmi_mode,
			calibration_constants: settings.vmi[vmi_mode],
		};
		uiEmitter.emit(UI.INFO.RESPONSE.VMIINFO, vmi_info);
	}
}

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const page_info = {
	current_tab: UI.TAB.SEVI,
};
