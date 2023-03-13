/************************************************** 

			Control for all UI elements

**************************************************/

const uiEmitter = new EventEmitter();

// List of all tabs (shown on the left side of main window)
// 	Values are the tab ID's listed in the Tab Bar section of mainWindow.html
const TAB = {
	SEVI: "SeviMode",
	IRSEVI: "IRSeviMode",
	IRACTION: "IRActionMode",
	SETTINGS: "Settings",
};

const UI = {
	CHANGE: {
		TAB: "UI-CHANGE-TAB",
		SEVI: {
			START: "UI-CHANGE-SEVI-START",
			SAVE: "UI-CHANGE-SEVI-SAVE",
			PAUSE: "UI-CHANGE-SEVI-PAUSE",
			RESUME: "UI-CHANGE-SEVI-RESUME",
		},
		AUTOSAVE: {
			ON: "UI-CHANGE-AUTOSAVE-ON",
			OFF: "UI-CHANGE-AUTOSAVE-OFF",
		},
	},
	INFO: {
		QUERY: {
			IMAGEID: "UI-INFO-QUERY-IMAGEID",
		},
		RESPONSE: {
			IMAGEID: "UI-INFO-RESPONSE-IMAGEID",
		},
	},
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, TAB.SEVI);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, TAB.IRSEVI);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	uiEmitter.emit(UI.CHANGE.TAB, TAB.IRACTION);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	uiEmitter.emit(UI.CHANGE.TAB, TAB.SETTINGS);
};

/*		Sevi Mode		*/

// Scan control buttons
document.getElementById("SeviScanStartSave").onclick = function () {
	// Check if there is a scan being taken or not
	// Only a scan that is currently running will be able to respond, so if there are no event listeners,
	//	then there is not a scan currently running
	let image_is_running = seviEmitter.emit(SEVI.QUERY.SCAN.RUNNING);

	// If an image is running, tell SEVI to stop scan
	if (image_is_running) seviEmitter.emit(SEVI.SCAN.STOP);
	// Else, tell SEVI to start scan
	else seviEmitter.emit(SEVI.SCAN.START);
};
// Change button from start to save when scan is started
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, () => {
	uiEmitter.emit(UI.CHANGE.SEVI.SAVE);
});
// Change button from save to start when scan is stopped
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	uiEmitter.emit(UI.CHANGE.SEVI.START);
});

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

// Change SEVI Pause/Resume button to Resume
uiEmitter.on(UI.CHANGE.SEVI.PAUSE, () => {
	const pause_button_text = document.getElementById("SeviScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
});

// Return requested current ID value
uiEmitter.on(UI.INFO.QUERY.IMAGEID, () => {
	const image_counter = document.getElementById("SeviImageCounter");
	let current_counter_val;
	if (image_counter) current_counter_val = parseInt(image_counter.value);
	else current_counter_val = -1;
	uiEmitter.emit(UI.INFO.RESPONSE.IMAGEID, current_counter_val);
});

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const page_info = {
	current_tab: TAB.SEVI,
};
