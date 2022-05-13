/*
	This is a list of all functions used in main window Renderer

	For some reason it's necessary to wrap .onclick and .oninput functions with function(){}
*/

/*


*/
/*			Event Listeners			*/
/*


*/

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send("main-window-ready", null);
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	switch_tabs(0);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	switch_tabs(1);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	switch_tabs(2);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	switch_tabs(8);
};

/*		Sevi and IR-Sevi Mode		*/

document.getElementById("SeviPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
};
document.getElementById("SeviPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		IR Action Mode		*/

document.getElementById("IRActionPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
};
document.getElementById("IRActionPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		Settings		*/

document.getElementById("SaveSettingsButton").onclick = function () {
	// Save settings button
	SaveSettings();
};

/*


*/
/*			Event Listener Functions			*/
/*


*/

/*		Startup		*/

// Execute various functions on application startup
function startup() {
	// Go to Sevi Mode tab (ID = 0)
	switch_tabs(0);

	// Color the accumulated image display black
	fill_image_display();
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
// and then activate the tab 'Tab'
function switch_tabs(tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// 		Some tabs are left empty and can be filled in if a new tab is added in the future
	// 0 => SEVI mode, 1 => IR-SEVI Mode, 2 => IR Action Mode,
	// 3 => blank, 4 => blank, 5 => blank, 6 => blank, 7 => blank,
	// 8 => Settings section
	//
	// If you only want to hide all tabs and show nothing,
	// call the function with no parameters

	// List of each tab section
	const tab_list = [
		document.getElementById("SeviMode"),
		document.getElementById("IRSeviMode"),
		document.getElementById("IRActionMode"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("Settings"),
	];

	// Content corresponding to each tab
	const content_list = [
		document.getElementById("SeviModeContent"),
		document.getElementById("SeviModeContent"),
		document.getElementById("IRActionModeContent"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("SettingsContent"),
	];

	// Depress the current tab and hide content
	tab_list[page_info.current_tab].classList.remove("pressed-tab");
	content_list[page_info.current_tab].style.display = "none";

	// Make sure the tab argument passed is an integer corresponding to a real tab
	if (!tab_list[tab]) {
		console.log("Returned");
		return;
	}

	// Store the current tab info
	page_info.current_tab = tab;

	// Activate selected tab and show content
	tab_list[tab].classList.add("pressed-tab");
	content_list[tab].style.display = "grid";

	// If a scan is not currently being taken, switch the scan method (if relevant)
	let sevi_methods = ["sevi", "ir-sevi", "ir-action"];
	if (!scan.status.running && sevi_methods[tab]) {
		scan.status.method = sevi_methods[tab];
	}

	// If chosen tab is Sevi or IR-Sevi mode, we have to do a bit more
	// since IR-SEVI is just Sevi with a few more elements shown
	if (tab <= 1) {
		// Remove class of the tab not chosen (e.g. remove "sevi-mode" if ir-sevi chosen)
		content_list[tab].classList.remove(sevi_methods[(tab + 1) % 2] + "-mode");
		// Add class of the chosen tab
		content_list[tab].classList.add(sevi_methods[tab] + "-mode");
	}

	// Lastly, make sure we switch to the first page (if there are two)
	switch_pages(0);
}

// Switch between first and second page
function switch_pages(page_index) {
	// page_index = 0 to switch to first page, 1 to switch to second
	let page_prefix;
	if (page_info.current_tab <= 1) {
		// Currently on Sevi or IR-Sevi tab
		page_prefix = "Sevi";
	} else if (page_info.current_tab == 2) {
		// Currently on IR Action tab
		page_prefix = "IRAction";
	} else {
		// Currently on a tab without pages, just return
		// Note: need to add another "else if" if you add another tab with two pages
		return;
	}

	const first_page = document.getElementById(page_prefix + "FirstPage");
	const second_page = document.getElementById(page_prefix + "SecondPage");

	if (page_index === 0) {
		// Display first page
		first_page.style.display = "grid";
		second_page.style.display = "none";
	} else if (page_index === 1) {
		// Display second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/* Sevi and IR-Sevi Modes */

// Color the accumulated image display black
function fill_image_display() {
	const display = document.getElementById("Display");
	const ctx = display.getContext("2d");
	let image_width = scan.accumulated_image.params.accumulation_width;
	let image_height = scan.accumulated_image.params.accumulation_height;

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, image_width, image_height);
}

/*


*/
/*			IPC Messages			*/
/*


*/

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
	startup();
});

/*


*/
/*			Various Functions			*/
/*


*/

/* Should move functions to the most related section */

// Format current date as MMDDYY
function getFormattedDate() {
	let today = new Date();
	let formattedDay = ("0" + today.getDate()).slice(-2);
	let formattedMonth = ("0" + (today.getMonth() + 1)).slice(-2);
	let formattedYear = today.getFullYear().toString().slice(-2);
	return formattedMonth + formattedDay + formattedYear;
}

// Format file name as MMDDYY_iXX_1024.i0N
function getCurrentFileName(ionCounter) {
	let todaysDate = getFormattedDate();
	// Slice here makes sure 0 is not included if ionCounter > 9
	let increment = ("0" + ionCounter).slice(-2);
	let fileString = `${todaysDate}i${increment}_1024.i0N`;
	let fileStringIR = `${todaysDate}i${increment}_IR_1024.i0N`;

	// Update file name in scan information
	scanInfo.fileName = fileString;
	scanInfo.fileNameIR = fileStringIR;

	// Check if that image already exists
	checkCurrentFile();

	return fileString;
}

// Check if file in Current File exists
function checkCurrentFile() {
	const currentFile = document.getElementById("CurrentFile");
	let fileName = settings.saveDirectory.currentScan + "/" + scanInfo.fileName;
	let fileNameIR = settings.saveDirectory.currentScan + "/" + scanInfo.fileNameIR;
	if (fs.existsSync(fileName) || fs.existsSync(fileNameIR)) {
		currentFile.title = "File already exists!";
		currentFile.style.color = "red";
		currentFile.style.border = "1pt solid red";
	} else {
		currentFile.title = null;
		currentFile.style.color = "white";
		currentFile.style.border = "1px solid rgb(62, 71, 95)";
	}
}

// ----------------------------------------------- //
