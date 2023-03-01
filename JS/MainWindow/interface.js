/************************************************** 

			Control for all UI elements

**************************************************/

const uiEmitter = new EventEmitter();

// List of all tabs (shown on the left side of main window)
// 	Values are the tab ID's listed in the Tab Bar section of mainWindow.html
const Tab_List = {
	SEVI: "SeviMode",
	IRSEVI: "IRSeviMode",
	IRACTION: "IRActionMode",
	SETTINGS: "Settings",
};
const Content_List = {
	SEVI: "SeviModeContent",
	IRSEVI: "SeviModeContent",
	IRACTION: "IRActionModeContent",
	SETTINGS: "SettingsContent",
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
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, Tab_List.SEVI);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	uiEmitter.emit(UI.CHANGE.TAB, Tab_List.IRSEVI);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	uiEmitter.emit(UI.CHANGE.TAB, Tab_List.IRACTION);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	uiEmitter.emit(UI.CHANGE.TAB, Tab_List.SETTINGS);
};

/* 		Event Listeners		*/

// Changing tabs
uiEmitter.on(UI.CHANGE.TAB, (tab) => {
	// Add functionality for tab switching
	console.log(`Changing tab to ${tab}`);

	// Depress the current tab and hide content
	let current_tab = document.getElementById(page_info.current_tab);
	let current_page = document.getElementById(page_info.current_page);
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Make sure the tab argument passed is an integer corresponding to a real tab
	if (!Tab_List[tab] || !Content_List[tab]) {
		return;
	}

	// Activate selected tab and show content
	let new_tab = document.getElementById(Tab_List[tab]);
	let new_page = document.getElementById(Content_List[tab]);
	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) {
		new_page.style.display = "grid";
	} else {
		console.log("Could not find tab", tab, Tab_List[tab]);
	}

	switch_pages(0);
});

// Change SEVI Start/Save button to Start
uiEmitter.on(UI.CHANGE.SEVI.START, () => {
	const start_button_text = document.getElementById("ScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Start";
});

// Change SEVI Start/Save button to Save
uiEmitter.on(UI.CHANGE.SEVI.SAVE, () => {
	const start_button_text = document.getElementById("ScanStartSaveText");
	if (start_button_text) start_button_text.innerText = "Save";
});

// Change SEVI Pause/Resume button to Resume
uiEmitter.on(UI.CHANGE.SEVI.RESUME, () => {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Resume";
});

// Change SEVI Pause/Resume button to Resume
uiEmitter.on(UI.CHANGE.SEVI.PAUSE, () => {
	const pause_button_text = document.getElementById("ScanPauseResumeText");
	if (pause_button_text) pause_button_text.innerText = "Pause";
});

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const page_info = {
	current_tab: Tab_List.SEVI,
	current_page: Content_List.SEVI,
};

// NEED TO REMOVE THIS
function switch_pages(page_index) {
	let page_prefix;
	if (page_info.current_tab === Tab_List.SEVI || page_info.current_tab === Tab_List.IRSEVI) {
		page_prefix = "Sevi";
	} else if (page_info.current_tab === Tab_List.IRACTION) {
		page_prefix = "IRAction";
	} else {
		// Currently on a tab without pages, just return
		// Note: need to add another "else if" if you add another tab with two pages
		return;
	}

	const first_page = document.getElementById(page_prefix + "FirstPage");
	const second_page = document.getElementById(page_prefix + "SecondPage");

	if (page_index === 0 && first_page && second_page) {
		// Display first page
		first_page.style.display = "grid";
		second_page.style.display = "none";

		// PE Spectrum is on second page, and needs to be destroyed if moving to first page
		//	(if it exists)
		destroy_spectrum_plot();
	} else if (page_index === 1 && first_page && second_page) {
		// Display second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}
