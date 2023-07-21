/************************************************** 

		Control for universal UI elements

**************************************************/

/**
 * Class used to make inputs only execute a function if nothing has been typed for 1s.
 * That way functions aren't prematurely executed before user is done typing.
 * @param {function} fn_to_execute - Function to execute when input is received
 * @param {array} args_to_pass - List of arguments to give the function to execute upon input
 */
class InputDelay {
	constructor(fn_to_execute, args_to_pass) {
		this.timeout = null;
		this.args_to_pass = args_to_pass || [];
		this.fn_to_execute = fn_to_execute;
	}
	/**
	 * Start 1s timer and execute if not interrupted by more inputs
	 */
	start_timer() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.execute();
		}, 1000 /* ms */);
	}
	execute() {
		this.fn_to_execute(...this.args_to_pass);
	}
}

/*****************************************************************************

							TABS

*****************************************************************************/

/****
		HTML Element Listeners
****/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	change_tab(UI.TAB.SEVI);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	change_tab(UI.TAB.IRSEVI);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	change_tab(UI.TAB.IRACTION);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	change_tab(UI.TAB.SETTINGS);
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.UPDATE.TAB, change_tab);

/****
		SEVI Event Listeners
****/

// Highlight tab of scan that is running so it's clear to user
seviEmitter.on(SEVI.ALERT.SCAN.STARTED, add_tab_highlight);
seviEmitter.on(SEVI.ALERT.SCAN.RESUMED, add_tab_highlight);
// If scan is stopped or canceled, remove tab highlight
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, remove_tab_highlight);
seviEmitter.on(SEVI.ALERT.SCAN.CANCELED, remove_tab_highlight);

/****
		Functions
****/

// Changing tabs
function change_tab(tab) {
	// Add functionality for tab switching
	if (tab === PageInfo.current_tab) return; // Already on that tab, no need to do anything

	// Depress the current tab and hide content
	let current_tab = document.getElementById(PageInfo.current_tab);
	let current_page = document.getElementById(PageInfo.current_tab + "Content");
	if (current_tab) current_tab.classList.remove("pressed-tab");
	if (current_page) current_page.style.display = "none";

	// Activate selected tab and show content
	let new_tab = document.getElementById(tab);
	let new_page = document.getElementById(tab + "Content");

	if (new_tab) new_tab.classList.add("pressed-tab");
	if (new_page) new_page.style.display = "grid";

	PageInfo.current_tab = tab;

	load_tab(tab);
}

// Send requests to load information to be displayed in that tab
function load_tab(tab) {
	switch (tab) {
		case UI.TAB.SEVI:
			uiEmitter.emit(UI.LOAD.SEVI);
			break;
		case UI.TAB.IRSEVI:
			uiEmitter.emit(UI.LOAD.IRSEVI);
			break;
		case UI.TAB.IRACTION:
			uiEmitter.emit(UI.LOAD.IRACTION);
			break;
		case UI.TAB.SETTINGS:
			uiEmitter.emit(UI.LOAD.SETTINGS);
			break;
	}
}

// Add highlights to SEVI or IRSEVI tabs if a respective scan is being taken
function add_tab_highlight() {
	// Figure out whether it was a SEVI scan or an IR-SEVI scan
	// (set up listener with .once(), then ask if it's IR with .emit() )
	seviEmitter.once(SEVI.RESPONSE.SCAN.ISIR, (is_ir) => {
		if (is_ir) {
			// Highlight IR-SEVI tab to show an IR-SEVI scan is running
			let tab = document.getElementById(UI.TAB.IRSEVI);
			if (tab) tab.classList.add("highlighted-tab");
		} else {
			// Highlight SEVI tab to show an SEVI scan is running
			let tab = document.getElementById(UI.TAB.SEVI);
			if (tab) tab.classList.add("highlighted-tab");
		}
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.ISIR);
}

// Remove tab highlight for SEVI and IRSEVI tabs
function remove_tab_highlight() {
	let tab = document.getElementById(UI.TAB.SEVI);
	if (tab) tab.classList.remove("highlighted-tab");
	tab = document.getElementById(UI.TAB.IRSEVI);
	if (tab) tab.classList.remove("highlighted-tab");
}

/*****************************************************************************

						IMAGE ID INFORMATION

*****************************************************************************/

const ImageIDInfo = {
	image_id: 1,
	increase: () => ImageIDInfo_increase(),
	decrease: () => ImageIDInfo_decrease(),
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.QUERY.IMAGEID, send_image_id_info);

uiEmitter.on(UI.UPDATE.IMAGEID.INCREASE, ImageIDInfo.increase);
uiEmitter.on(UI.UPDATE.IMAGEID.DECREASE, ImageIDInfo.decrease);

uiEmitter.on(UI.UPDATE.IMAGEID.RESUMEDIMAGE, () => {
	// An image that was stopped (canceled or saved) has been resumed
	// The Image ID should be changed to match that of the current image
	// (set up listener with .once(), then ask for ID with .emit() )
	seviEmitter.once(SEVI.RESPONSE.SCAN.CURRENTID, (image_id) => {
		ImageIDInfo.image_id = image_id;
		send_image_id_info();
	});
	seviEmitter.emit(SEVI.QUERY.SCAN.CURRENTID);
});

/****
		SEVI Event Listeners
****/

// When a scan is saved, increment the Image ID counter
seviEmitter.on(SEVI.ALERT.SCAN.STOPPED, () => {
	uiEmitter.emit(UI.UPDATE.IMAGEID.INCREASE);
});
// When a scan is resumed, update image ID to that of the current image
// (in case a previously saved image has been resumed)
seviEmitter.on(SEVI.ALERT.SCAN.RESUMED, () => {
	uiEmitter.emit(UI.UPDATE.IMAGEID.RESUMEDIMAGE);
});

/****
		Functions
****/

function ImageIDInfo_increase() {
	ImageIDInfo.image_id++;
	send_image_id_info();
}

function ImageIDInfo_decrease() {
	ImageIDInfo.image_id--;
	if (ImageIDInfo.image_id < 1) {
		ImageIDInfo.image_id = 1;
	}
	send_image_id_info();
}

function send_image_id_info() {
	uiEmitter.emit(UI.RESPONSE.IMAGEID, ImageIDInfo.image_id);
}

/*****************************************************************************

							VMI INFORMATION

*****************************************************************************/

const VMIInfo = {
	selected_mode: "V1",
	selected_index: 0,
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.QUERY.VMI, send_vmi_info);
uiEmitter.on(UI.UPDATE.VMI.INDEX, update_vmi_info);

/****
		Functions
****/

function send_vmi_info() {
	// Get calibration constants and package everything together
	let vmi_info = {
		index: VMIInfo.selected_index,
		mode: VMIInfo.selected_mode,
		calibration_constants: settings.vmi[VMIInfo.selected_mode],
	};
	uiEmitter.emit(UI.RESPONSE.VMI, vmi_info);
}

function update_vmi_info(selected_index) {
	// selected_index ranges from 0 to 3, where VMI mode = "V" + (selected_index+1)
	// (e.g. selected_index = 0 -> V1)
	if (selected_index > 3) {
		return;
	}
	let vmi_mode = `V${selected_index + 1}`;
	VMIInfo.selected_index = selected_index;
	VMIInfo.selected_mode = vmi_mode;
	send_vmi_info();
}

/*****************************************************************************

						ACCUMULATED IMAGE DISPLAYS

*****************************************************************************/

const DisplayInfo = {
	selected_index: 0, // Which accumulated image to display (IR Off = 0, IR On = 1, etc)
	slider_value: 0.5,
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.QUERY.DISPLAY.SELECTEDINDEX, () => {
	uiEmitter.emit(UI.RESPONSE.DISPLAY.SELECTEDINDEX, DisplayInfo.selected_index);
});
uiEmitter.on(UI.UPDATE.DISPLAY.SELECTEDINDEX, (value) => {
	DisplayInfo.selected_index = value;
});

uiEmitter.on(UI.QUERY.DISPLAY.SLIDERVALUE, () => {
	uiEmitter.emit(UI.RESPONSE.DISPLAY.SLIDERVALUE, DisplayInfo.slider_value);
});
uiEmitter.on(UI.UPDATE.DISPLAY.SLIDERVALUE, (value) => {
	DisplayInfo.slider_value = value;
});

/****
		Functions
****/

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const PageInfo = {
	current_tab: UI.TAB.NONE,
};

/****
		UI Event Listeners
****/

uiEmitter.on(UI.QUERY.CURRENTTAB, () => {
	uiEmitter.emit(UI.RESPONSE.CURRENTTAB, PageInfo.current_tab);
});
