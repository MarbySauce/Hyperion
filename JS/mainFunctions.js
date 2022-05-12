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
	//Startup();
	// Moved startup until after settings file is read

	// Send message to main process that the window is ready
	ipc.send("main-window-ready", null);
};

// Tabs
document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	SwitchTabs(0);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	SwitchTabs(1);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	SwitchTabs(2);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	SwitchTabs(3);
};

/*		Normal Mode		*/

/*		IR Action Mode		*/

document.getElementById("IRActionPageDown").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "none";
	secondPage.style.display = "grid";
};

document.getElementById("IRActionPageUp").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "grid";
	secondPage.style.display = "none";
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
function Startup() {
	SwitchTabs();

	// Go to Normal Mode tab (ID = 0)
	SwitchTabs(0);

	// Dummy functions for aesthetics
	make_display_black();
	add_file_names();
	add_photon_energies();
	sevi_page_down_function();
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
// and then activate the tab 'Tab'
function SwitchTabs(Tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// e.g. NormalMode = 0, IRMode = 1, DetachmentMode = 2,
	// 		Settings = 3
	//
	// If you only want to hide all tabs and show nothing,
	// call the function with no parameters

	// List of each tab section
	const tabList = [
		document.getElementById("SeviMode"),
		document.getElementById("IRSeviMode"),
		document.getElementById("IRActionMode"),
		document.getElementById("Settings"),
	];

	// Content corresponding to each tab
	const contentList = [
		document.getElementById("SeviModeContent"),
		document.getElementById("SeviModeContent"),
		document.getElementById("IRActionModeContent"),
		document.getElementById("SettingsContent"),
	];

	// Depress each tab
	for (let i = 0; i < tabList.length; i++) {
		tabList[i].classList.remove("pressed-tab");
	}

	// Make sure the Tab argument passed is an integer
	// and that the element tabList[Tab] exists
	if (!tabList[Tab]) {
		// If no arguments were passed, Tab is not a number,
		// Tab is too large, or Tab is negative,
		// do not activate any tabs
		return;
	}

	// Store the current tab info
	pageInfo.currentTab = Tab;

	// Activate Normal or IR tab
	// IR is an augmentation of Normal Mode
	// So we have to be a bit more careful here
	if (Tab == 0 || Tab == 1) {
		// Hide other pages if shown
		for (let i = 2; i < tabList.length; i++) {
			contentList[i].style.display = "none";
		}
		// Display Normal Mode's content
		contentList[0].style.display = "grid";

		switch (Tab) {
			case 0:
				if (!scanInfo.running) {
					// Switch to normal mode method if scan is not being taken
					scanInfo.method = "normal";
				}
				tabList[Tab].classList.add("pressed-tab");
				contentList[Tab].classList.remove("ir-sevi-mode");
				contentList[Tab].classList.add("sevi-mode");
				//RemoveIRLabels();
				break;
			case 1:
				if (!scanInfo.running) {
					// Switch to IR mode method if scan is not being taken
					scanInfo.method = "ir";
				}
				tabList[Tab].classList.add("pressed-tab");
				contentList[Tab].classList.remove("sevi-mode");
				contentList[Tab].classList.add("ir-sevi-mode");
				//AddIRLabels();
				break;
		}

		//SwitchAccumulatedImages();
	} else {
		// Hide all pages
		for (let i = 0; i < tabList.length; i++) {
			contentList[i].style.display = "none";
		}
		// Activate the selected tab
		tabList[Tab].classList.add("pressed-tab");
		contentList[Tab].style.display = "grid";
		return;
	}
}

let spectrum_display;
// NOTE TO MARTY: Should probably try to make all of these one (or two) functions
document.getElementById("SeviPageDown").onclick = function () {
	sevi_page_down_function();
};

function sevi_page_down_function() {
	const firstPage = document.getElementById("SeviFirstPage");
	const secondPage = document.getElementById("SeviSecondPage");

	firstPage.style.display = "none";
	secondPage.style.display = "grid";

	console.time("Spectrum");
	spectrum_display = new Chart(document.getElementById("PESpectrum").getContext("2d"), {
		type: "line",
		data: {
			labels: [0, 1, 2, 3, 4, 5],
			datasets: [
				{
					data: [0, 2, 0, 0, 1.8, 0],
					label: "IR On",
					borderColor: "red",
				},
				{
					data: [0, 1, 0, 0, 2, 0],
					label: "IR Off",
					borderColor: "black",
				},
			],
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,
					title: {
						text: "Electron Intensity",
						color: "black",
						display: true,
					},
				},
				x: {
					title: {
						text: "eBE ( cm\u207B\u00B9 )", // \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
						color: "black",
						display: true,
					},
				},
			},
			plugins: {
				title: {
					display: true,
					fullSize: false,
					align: "end",
					text: "Displaying Image: i01",
					padding: 0,
				},
			},
			//animation: false,
			//aspectRatio: 2.8,
		},
	});
	console.timeEnd("Spectrum");
}

document.getElementById("SeviPageUp").onclick = function () {
	const firstPage = document.getElementById("SeviFirstPage");
	const secondPage = document.getElementById("SeviSecondPage");

	firstPage.style.display = "grid";
	secondPage.style.display = "none";

	spectrum_display.destroy();
};

document.getElementById("IRActionPageDown").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "none";
	secondPage.style.display = "grid";
};

document.getElementById("IRActionPageUp").onclick = function () {
	const firstPage = document.getElementById("IRActionFirstPage");
	const secondPage = document.getElementById("IRActionSecondPage");

	firstPage.style.display = "grid";
	secondPage.style.display = "none";
};

ipc.on("settings-information", (event, settingsInformation) => {
	//console.log(settingsInformation);
	settings = settingsInformation;
	Startup();
});

/* When update e- counters on main page, also update on e- Monitor page
	and add in an if statement whether to add to chart
	And have addon send over calc time data */

function make_display_black() {
	const display = document.getElementById("Display");
	const ctx = display.getContext("2d");
	let image_width = scan.accumulated_image.params.accumulation_width;
	let image_height = scan.accumulated_image.params.accumulation_height;

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, image_width, image_height);
}

function add_file_names() {
	const image_file = document.getElementById("CurrentImageFile");
	const ir_image_file = document.getElementById("CurrentImageFileIROn");
	let current_date = getFormattedDate();
	image_file.value = current_date + "i01_1024.i0N";
	ir_image_file.value = current_date + "i01_IR_1024.i0N";
}

function add_photon_energies() {
	const detachment_wavelength = document.getElementById("DetachmentWavelength");
	const detachment_converted_wavelength = document.getElementById("ConvertedWavelength");
	const detachment_wavenumber = document.getElementById("DetachmentWavenumber");
	const ir_detachment_wavelength = document.getElementById("IRWavelength");
	const ir_detachment_converted_wavelength = document.getElementById("IRConvertedWavelength");
	const ir_detachment_wavenumber = document.getElementById("IRWavenumber");
	const desired_energy = document.getElementById("DesiredEnergy");
	const desired_range_message = document.getElementById("DesiredIRRangeMessage");

	detachment_wavelength.value = 640.054;
	detachment_wavenumber.value = 15623.682;
	ir_detachment_wavelength.value = 837.799;
	ir_detachment_converted_wavelength.value = 3933.979;
	ir_detachment_wavenumber.value = 2541.955;
	desired_energy.value = 2543.567;
	desired_range_message.innerText = "[ " + "mIR" + " ]";
}

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
