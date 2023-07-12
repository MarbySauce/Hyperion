/************************************************** 

		Control for universal UI elements

**************************************************/

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

uiEmitter.on(UI.CHANGE.TAB, change_tab);

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

uiEmitter.on(UI.INFO.QUERY.IMAGEID, send_image_id_info);

uiEmitter.on(UI.CHANGE.IMAGEID.INCREASE, ImageIDInfo.increase);
uiEmitter.on(UI.CHANGE.IMAGEID.DECREASE, ImageIDInfo.decrease);

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
	uiEmitter.emit(UI.INFO.RESPONSE.IMAGEID, ImageIDInfo.image_id);
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

uiEmitter.on(UI.INFO.QUERY.VMI, send_vmi_info);
uiEmitter.on(UI.CHANGE.VMI.INDEX, update_vmi_info);

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
	uiEmitter.emit(UI.INFO.RESPONSE.VMI, vmi_info);
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

							PAGE INFORMATION

*****************************************************************************/

const PageInfo = {
	current_tab: UI.TAB.SEVI,
};
