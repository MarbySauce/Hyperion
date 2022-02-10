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
};

// Tabs
document.getElementById("NormalMode").onclick = function () {
	// Normal mode tab
	SwitchTabs(0);
};
document.getElementById("IRMode").onclick = function () {
	// IR mode tab
	SwitchTabs(1);
};
document.getElementById("DepletionMode").onclick = function () {
	// Depletion mode tab
	SwitchTabs(2);
};
document.getElementById("EMonitor").onclick = function () {
	// e- monitor tab
	SwitchTabs(3);
};
document.getElementById("PostProcess").onclick = function () {
	// Post processing tab
	SwitchTabs(4);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	SwitchTabs(5);
};

/*		Normal Mode		*/

// Scan Controls
document.getElementById("StartSave").onclick = function () {
	// Start/Save scan button
	StartSaveScan();
};
document.getElementById("Pause").onclick = function () {
	// Pause scan button
	const NormalModeContent = document.getElementById("NormalModeContent");

	// Toggle pause status (e.g. if running, pause; if paused, resume)
	scanInfo.paused = !scanInfo.paused;
	// Send message to Live View that scan was paused/resumed
	if (scanInfo.paused) {
		ipc.send("ScanUpdate", "pause");
		// Gray out display to make it clear that the scan is paused
		NormalModeContent.classList.add("paused");
	} else {
		ipc.send("ScanUpdate", "resume");
		// Go back to normal display
		NormalModeContent.classList.remove("paused");
	}
	// Change Pause button text
	UpdatePauseButtonText();
	// Enable/disable Single Shot button
	UpdateSSButtonStatus();
};
document.getElementById("SingleShot").onclick = function () {
	// Single shot button
	//console.log("Executed SS");
	singleShot.toSave = true;
};

// Save Controls
document.getElementById("CurrentFile").oninput = function () {
	// File name is manually typed
	scanInfo.updateFileName(document.getElementById("CurrentFile").value);
};
document.getElementById("I0NCounterDown").onclick = function () {
	// Decrease file increment
	I0NCounterDown();
};
document.getElementById("I0NCounterUp").onclick = function () {
	// Increase file increment
	I0NCounterUp();
};
document.getElementById("WavelengthMode").oninput = function () {
	// Detachment laser setup dropdown menu
	GetLaserInput();
	UpdateLaserWavelength();
};
document.getElementById("CurrentWavelength").oninput = function () {
	// Detachment laser wavelength input section
	GetLaserInput();
	UpdateLaserWavelength();
};
document.getElementById("IRWavelengthMode").oninput = function () {
	// IR laser setup dropdown menu
	GetLaserInput();
	UpdateLaserWavelength();
};
document.getElementById("CurrentWavelengthNIR").oninput = function () {
	// OPO/A laser wavelength input section
	GetLaserInput();
	UpdateLaserWavelength();
};
document.getElementById("ChangeSaveDirectory").onclick = function () {
	// Change Save Directory button
	// Send message to main process to update directory
	ipc.send("UpdateSaveDirectory", null);
};

// Display

// IR Image display selector
document.getElementById("IRImageDisplay").oninput = function () {
	SwitchAccumulatedImages();
};
// Control slider's display
document.getElementById("DisplaySlider1").onmouseover = function () {
	MainSliderMouseOverFn();
};
document.getElementById("DisplaySlider1").onmouseout = function () {
	MainSliderMouseOutFn();
};
document.getElementById("DisplaySlider1").oninput = function () {
	UpdateAccumulatedImageDisplay(); // Update image contrast
	MainSliderMouseOverFn();
};

// Electron Counters
document.getElementById("ResetCounters").onclick = function () {
	// Reset counters button
	scanCounters.reset();
	UpdateScanCountDisplays();
};

/*		e- Monitor		*/

// Buttons
document.getElementById("eChartStartStop").onclick = function () {
	// Start/Stop button for e- chart
	eChartStartStop();
};
document.getElementById("eChartReset").onclick = function () {
	// Reset button for e- chart
	eChartData.reset();
	eChartData.updateChart(eChart);
};

// Axes Controls
document.getElementById("eChartYAxisUp").onclick = function () {
	// Increase e- chart y (vertical) axis scale
	eChartData.zoomAxis("Y", "increase");
	eChartData.updateChart(eChart);
	eChartUpdateAxisLabels();
};
document.getElementById("eChartYAxisDown").onclick = function () {
	// Decrease e- chart y (vertical) axis scale
	eChartData.zoomAxis("Y", "decrease");
	eChartData.updateChart(eChart);
	eChartUpdateAxisLabels();
};
document.getElementById("eChartXAxisUp").onclick = function () {
	// Increase e- chart x (horizontal) axis scale
	eChartData.zoomAxis("X", "increase");
	eChartData.updateChart(eChart);
	eChartUpdateAxisLabels();
};
document.getElementById("eChartXAxisDown").onclick = function () {
	// Decrease e- chart x (horizontal) axis scale
	eChartData.zoomAxis("X", "decrease");
	eChartData.cleaveData(); // Get rid of extra data points in chart
	eChartData.updateChart(eChart);
	eChartUpdateAxisLabels();
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
	const saveDirectory = document.getElementById("SaveDirectory");
	const mainDisplay = document.getElementById("Display");
	const mainDisplayContext = mainDisplay.getContext("2d");
	const mainDisplayIROff = document.getElementById("DisplayIROff");
	const mainDisplayContextIROff = mainDisplayIROff.getContext("2d");
	const mainDisplayIROn = document.getElementById("DisplayIROn");
	const mainDisplayContextIROn = mainDisplayIROn.getContext("2d");
	const mainDisplayIRDiff = document.getElementById("DisplayIRDifference");
	const mainDisplayContextIRDiff = mainDisplayIRDiff.getContext("2d");

	SwitchTabs();

	// Get the settings from file
	ReadSettingsFromFileSync();

	// Apply the settings
	ApplySettings();

	// Update displays
	eChartUpdateAxisLabels();

	// Go to Normal Mode tab (ID = 0)
	SwitchTabs(0);

	// Create accumulated image arrays
	accumulatedImage.reset();

	// Get todays date (formatted)
	//todaysDate = getFormattedDate();

	// Update CurrentFile and CurrentDirectory displays
	saveDirectory.value = settings.saveDirectory.currentScanShort;

	// Find today's previous files JSON file and read
	//tartupReadRecentFiles();
	previousScans.readScans();

	// Fill display and get image data
	mainDisplayContext.fillstyle = "black";
	mainDisplayContext.fillRect(0, 0, accumulatedImage.width, accumulatedImage.height);
	mainDisplayContextIROff.fillstyle = "black";
	mainDisplayContextIROff.fillRect(0, 0, accumulatedImage.width, accumulatedImage.height);
	mainDisplayContextIROn.fillstyle = "black";
	mainDisplayContextIROn.fillRect(0, 0, accumulatedImage.width, accumulatedImage.height);
	mainDisplayContextIRDiff.fillstyle = "black";
	mainDisplayContextIRDiff.fillRect(0, 0, accumulatedImage.width, accumulatedImage.height);

	// Start centroiding
	ipc.send("StartCentroiding", null);
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
// and then activate the tab 'Tab'
function SwitchTabs(Tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// e.g. NormalMode = 0, IRMode = 1, DetachmentMode = 2,
	// 		EMonitor = 3, PostProcess = 4, Settings = 5
	//
	// If you only want to hide all tabs and show nothing,
	// call the function with no parameters

	// List of each tab section
	const tabList = [
		document.getElementById("NormalMode"),
		document.getElementById("IRMode"),
		document.getElementById("DepletionMode"),
		document.getElementById("EMonitor"),
		document.getElementById("PostProcess"),
		document.getElementById("Settings"),
	];

	// Content corresponding to each tab
	const contentList = [
		document.getElementById("NormalModeContent"),
		document.getElementById("NormalModeContent"),
		document.getElementById("NormalModeContent"),
		document.getElementById("EMonitorContent"),
		document.getElementById("PostProcessContent"),
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
	// IR and Depletion Mode are augmentations of Normal Mode
	// So we have to be a bit more careful here
	if (Tab >= 0 && Tab <= 2) {
		// Hide other pages if shown
		for (let i = 3; i < tabList.length; i++) {
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
				contentList[Tab].classList.remove("ir-mode");
				contentList[Tab].classList.remove("depletion-mode");
				contentList[Tab].classList.add("normal-mode");
				RemoveIRLabels();
				break;
			case 1:
				if (!scanInfo.running) {
					// Switch to IR mode method if scan is not being taken
					scanInfo.method = "ir";
				}
				tabList[Tab].classList.add("pressed-tab");
				contentList[Tab].classList.remove("normal-mode");
				contentList[Tab].classList.remove("depletion-mode");
				contentList[Tab].classList.add("ir-mode");
				AddIRLabels();
				break;
			case 2:
				if (!scanInfo.running) {
					// Switch to depletion mode method if scan is not being taken
					scanInfo.method = "depletion";
				}
				tabList[Tab].classList.add("pressed-tab");
				contentList[Tab].classList.remove("normal-mode");
				contentList[Tab].classList.add("ir-mode");
				contentList[Tab].classList.add("depletion-mode");
				AddIRLabels();
				break;
		}

		SwitchAccumulatedImages();
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

// Remove the labels displayed for IR mode
function RemoveIRLabels() {
	const totalFramesLabel = document.getElementById("TotalFramesLabel");
	const totalECountLabel = document.getElementById("TotalECountLabel");
	const currentFile = document.getElementById("CurrentFile");

	totalFramesLabel.innerHTML = "Total Frames:";
	totalECountLabel.innerHTML = "Total e<sup>-</sup> Count:";
	currentFile.value = scanInfo.fileName;
}

// Add the labels displayed for IR mode
function AddIRLabels() {
	const totalFramesLabel = document.getElementById("TotalFramesLabel");
	const totalECountLabel = document.getElementById("TotalECountLabel");
	const currentFile = document.getElementById("CurrentFile");

	totalFramesLabel.innerHTML = "Total Frames (IR Off):";
	totalECountLabel.innerHTML = "Total e<sup>-</sup> Count (IR Off):";
	currentFile.value = scanInfo.fileName + ", " + scanInfo.fileNameIR;
}

/*		Normal Mode		*/

// Scan Controls

// Start a scan or save it if scan is already started
function StartSaveScan() {
	const currentFile = document.getElementById("CurrentFile");
	const i0NCounterUp = document.getElementById("I0NCounterUp");
	const i0NCounterDown = document.getElementById("I0NCounterDown");

	// Make sure scan is not considered paused
	scanInfo.paused = false;

	if (!scanInfo.running) {
		// Button press indicates a new scan should be started

		// Reset counters
		scanInfo.reset();
		UpdateScanCountDisplays();

		// Reset accumulated image
		accumulatedImage.reset();
		UpdateAccumulatedImageDisplay(true); // Called with 'true' to reset entire image

		// Disable increment buttons and current file input
		// That way image isn't saved to two different files
		currentFile.disabled = true;
		i0NCounterUp.disabled = true;
		i0NCounterDown.disabled = true;

		// Send message to Live View that a scan was started
		ipc.send("ScanUpdate", "start");

		// Start centroiding (and auto-saving)
		scanInfo.startScan();
	} else {
		// Button press indicates the current scan should be stopped and saved

		// Stop the scan (and auto-saving)
		scanInfo.stopScan();

		// Save the image
		scanInfo.saveImage();

		// Save all centers to file
		//fs.writeFile("./Images/AllCenters.txt", accumulatedImage.convertToString("centers"), () => {
		//	console.log("Centers Saved!");
		//});

		scanInfo.hasBeenSaved = false;

		// Re-enable file name controls
		currentFile.disabled = false;
		i0NCounterUp.disabled = false;
		i0NCounterDown.disabled = false;

		// Send message to Live View that the scan was stopped
		ipc.send("ScanUpdate", "stop");

		// Tick up increment counter
		I0NCounterUp();
	}

	// Change start/save and pause button values
	UpdateStartSaveButtonText();
	UpdatePauseButtonText();

	// Disable/enable pause and single shot buttons
	UpdatePauseButtonStatus();
	UpdateSSButtonStatus();
}

// Change text of Start/Save Button
// false scan status means text should change from "Start" to "Save"
function UpdateStartSaveButtonText() {
	const startButtonImg = document.getElementById("StartButtonImg");
	const startButtonText = document.getElementById("StartButtonText");

	if (scanInfo.running) {
		// Scan has been started, change button to "Save"
		startButtonText.innerText = "Save";
		startButtonImg.src = "../ImageSrc/Save.png";
	} else {
		// Scan has been saved
		startButtonText.innerText = "Start";
		startButtonImg.src = "../ImageSrc/Play.png";
	}
}

// Change Pause button text
// true scan status means text should change from "Pause" to "Resume"
function UpdatePauseButtonText() {
	const pauseButtonImg = document.getElementById("PauseButtonImg");
	const pauseButtonText = document.getElementById("PauseButtonText");

	// if paused, change to resume
	// if not paused, change to pause
	// if paused and not running, change to pause

	if (scanInfo.paused && scanInfo.running) {
		// Scan was running, pause button has just been pressed
		// Change text to "Resume"
		pauseButtonText.innerText = "Resume";
		pauseButtonImg.src = "../ImageSrc/Play.png";
	} else {
		// Scan has resumed (or been saved), change text back to "Pause"
		pauseButtonText.innerText = "Pause"; // Reset pause button text & image
		pauseButtonImg.src = "../ImageSrc/Pause.png";
	}
}

// Enable/disable Pause button
function UpdatePauseButtonStatus() {
	const pause = document.getElementById("Pause");

	// If scan has been started (scanInfo.running = true), enable button
	// if scan has been saved (scanInfo.running = false), disable button
	pause.disabled = !scanInfo.running;
}

// Enable/disable Single Shot button
function UpdateSSButtonStatus() {
	const singleShot = document.getElementById("SingleShot");

	// If scan is running, disable button
	// If scan is running but paused, enable button
	// If scan is not running, enable button
	if (scanInfo.running && !scanInfo.paused) {
		singleShot.disabled = true;
	} else {
		singleShot.disabled = false;
	}
}

// Update Recent Files Section with recent scan
function UpdateRecentFiles(saveFile) {
	const recentScansSection = document.getElementById("RecentScansSection");
	let keyList;
	let currentMode = saveFile.detachmentMode;
	let IRMode = saveFile.IRMode;
	let tag; // tag, text, and textNode used for appending <p> elements
	let text;
	let textNode;
	if (saveFile.fileNameIR) {
		// Check if there was an IR file saved
		keyList = [
			"fileName",
			"inputWavelength",
			"convertedWavelength",
			"convertedWavenumber",
			"totalFrames",
			"totalCount",
			"fileNameIR",
			"nIRWavelength",
			"IRConvertedWavelength",
			"IRConvertedWavenumber",
			"totalFramesIR",
			"totalCountIR",
		];
		previousScans.displayedScans += 2;
	} else {
		keyList = ["fileName", "inputWavelength", "convertedWavelength", "convertedWavenumber", "totalFrames", "totalCount"];
		previousScans.displayedScans++;
	}

	for (let key of keyList) {
		if (currentMode == 0) {
			// If standard detachment setup, only write the inputed value
			// (i.e. use input wavelength, skip converted wavelength)
			if (key == "convertedWavelength") {
				continue;
			}
		} else {
			// If not standard setup, only write the converted value
			// (i.e. use converted wavelength, skip input wavelength)
			if (key == "inputWavelength") {
				continue;
			}
		}

		if (IRMode == 0) {
			// Excited with nIR, only write input value
			if (key == "IRConvertedWavelength") {
				continue;
			}
		} else {
			// Used iIR or mIR, only write converted value
			if (key == "nIRWavelength") {
				continue;
			}
		}

		tag = document.createElement("p");
		if (saveFile[key] != null) {
			if (typeof saveFile[key] == "number") {
				text = saveFile[key].toFixed(3).toString();
			} else {
				text = saveFile[key].toString();
			}
		} else {
			text = "";
		}
		textNode = document.createTextNode(text);
		tag.appendChild(textNode);
		recentScansSection.appendChild(tag);
	}
}

// Remove all scans from the recent scans display
function RemoveAllScansFromDisplay() {
	const recentScansSection = document.getElementById("RecentScansSection");
	const displayLength = recentScansSection.children.length;
	for (let i = 0; i < displayLength; i++) {
		recentScansSection.removeChild(recentScansSection.children[0]);
	}
}

// Add all scans in previousScans to display
function AddAllScansToDisplay() {
	const prevScansLength = previousScans.allScans.length;
	// Sort previous scans first
	previousScans.sort();
	for (let i = 0; i < prevScansLength; i++) {
		UpdateRecentFiles(previousScans.allScans[i]);
	}
}

// Save Controls

// Decrease file counter increment by one
function I0NCounterDown() {
	const currentFile = document.getElementById("CurrentFile");
	const i0NCounter = document.getElementById("I0NCounter");
	let currentCount = parseInt(i0NCounter.value);

	if (currentCount > 1) {
		currentCount -= 1;
	}
	i0NCounter.value = currentCount;
	currentFile.value = getCurrentFileName(currentCount);
	if (pageInfo.currentTab === 1) {
		currentFile.value += ", " + scanInfo.fileNameIR;
	}
}

// Increase file counter increment by one
function I0NCounterUp() {
	const currentFile = document.getElementById("CurrentFile");
	const i0NCounter = document.getElementById("I0NCounter");
	let currentCount = parseInt(i0NCounter.value);

	currentCount++;
	i0NCounter.value = currentCount;
	currentFile.value = getCurrentFileName(currentCount);
	if (pageInfo.currentTab === 1) {
		currentFile.value += ", " + scanInfo.fileNameIR;
	}
}

// Convert photon energy based on detachment laser setup and user input
function GetLaserInput() {
	const wavelengthMode = document.getElementById("WavelengthMode");
	const currentWavelength = document.getElementById("CurrentWavelength");
	let mode = wavelengthMode.selectedIndex; // Detachment laser setup mode
	// 0 is Standard, 1 is Doubled, 2 is Raman Shifter, 3 is IR-DFG
	let wavelength = parseFloat(currentWavelength.value); // Measured laser wavelength
	const IRWavelengthMode = document.getElementById("IRWavelengthMode");
	const currentWavelengthNIR = document.getElementById("CurrentWavelengthNIR");
	let IRMode = IRWavelengthMode.selectedIndex; // IR laser setup mode
	// 0 is nIR, 1 is iIR, 2 is mIR
	let IRWavelength = parseFloat(currentWavelengthNIR.value); // Measured nIR wavelength

	// Update laser information
	laserInfo.updateMode(mode);
	laserInfo.updateWavelength(wavelength);
	laserInfo.updateIRMode(IRMode);
	laserInfo.updateIRWavelength(IRWavelength);
}

// Update laser wavelength displays
function UpdateLaserWavelength() {
	const convertedWavelength = document.getElementById("ConvertedWavelength");
	const convertedWavenumber = document.getElementById("CurrentWavenumber");
	const convertedWavelengthIR = document.getElementById("ConvertedWavelengthIR");
	const convertedWavenumberIR = document.getElementById("CurrentWavenumberIR");

	// Convert laser energies based on detachment mode
	laserInfo.convert();
	laserInfo.convertIR();

	// Need if/else in case input was never defined or standard setup is being used
	if (laserInfo.convertedWavelength != null) {
		convertedWavelength.value = laserInfo.convertedWavelength.toFixed(3);
	} else {
		convertedWavelength.value = "";
	}
	if (laserInfo.convertedWavenumber != null) {
		convertedWavenumber.value = laserInfo.convertedWavenumber.toFixed(3);
	} else {
		convertedWavenumber.value = "";
	}
	if (laserInfo.IRConvertedWavelength != null) {
		convertedWavelengthIR.value = laserInfo.IRConvertedWavelength.toFixed(3);
	} else {
		convertedWavelengthIR.value = "";
	}
	if (laserInfo.IRConvertedWavenumber != null) {
		convertedWavenumberIR.value = laserInfo.IRConvertedWavenumber.toFixed(3);
	} else {
		convertedWavenumberIR.value = "";
	}
}

// Update the wavelength input on startup if there's a recent scan with defined wavelength
function UpdateLaserWavelengthInput() {
	const wavelengthMode = document.getElementById("WavelengthMode");
	const currentWavelength = document.getElementById("CurrentWavelength");
	const wavelengthModeIR = document.getElementById("IRWavelengthMode");
	const currentWavelengthIR = document.getElementById("CurrentWavelengthNIR");

	// Update displays
	wavelengthMode.selectedIndex = laserInfo.detachmentMode;
	wavelengthModeIR.selectedIndex = laserInfo.IRMode;
	if (laserInfo.inputWavelength) {
		currentWavelength.value = laserInfo.inputWavelength.toFixed(3);
	}
	if (laserInfo.nIRWavelength) {
		currentWavelengthIR.value = laserInfo.nIRWavelength.toFixed(3);
	}
}

/*
Probably useful to create a unitConversions.js file to do all of these
*/

// Convert wavelength in nm to wavenumbers
function convertNMtoWN(wavelength) {
	return Math.pow(10, 7) / wavelength;
}

// Convert wavenumbers to wavelength in nm
function convertWNtoNM(wavenumber) {
	// It's the same as NMtoWN, but I think it's easier to read the code this way
	return Math.pow(10, 7) / wavenumber;
}

// Switch between each of the accumulated images to display
function SwitchAccumulatedImages() {
	const IRImageDisplay = document.getElementById("IRImageDisplay");
	let imageToDisplay;
	const displays = [
		document.getElementById("Display"),
		document.getElementById("DisplayIROff"),
		document.getElementById("DisplayIROn"),
		document.getElementById("DisplayIRDifference"),
	];
	if (scanInfo.method === "ir") {
		imageToDisplay = IRImageDisplay.selectedIndex + 1;
	} else {
		imageToDisplay = 0;
	}
	for (let i = 0; i < 4; i++) {
		if (i === imageToDisplay) {
			displays[i].classList.remove("inactive-display");
			displays[i].classList.add("active-display");
		} else {
			displays[i].classList.remove("active-display");
			displays[i].classList.add("inactive-display");
		}
	}
}

// Create hover color change for sliders
function MainSliderMouseOverFn() {
	const mainDisplaySlider = document.getElementById("DisplaySlider1");
	const backgroundBlue = "hsla(225, 50%, 65%, 1)";
	let sliderValue = (100 * (mainDisplaySlider.value - mainDisplaySlider.min)) / (mainDisplaySlider.max - mainDisplaySlider.min);

	mainDisplaySlider.style.background = `linear-gradient(to right, ${backgroundBlue} 0%, ${backgroundBlue} ${sliderValue}%, hsla(225, 20%, 25%, 1) 0%)`;
}

function MainSliderMouseOutFn() {
	const mainDisplaySlider = document.getElementById("DisplaySlider1");

	mainDisplaySlider.style.background = "hsla(225, 20%, 25%, 1)";
}

/*		e- Monitor		*/

/*

Should try adding an eChartData object that does all the update processing,
and then say 'eChart.data.labels = eChartData.labels' or something

*/

// Start/stop the electron counter chart
function eChartStartStop() {
	const eChartStartButtonText = document.getElementById("eChartStartButtonText");
	const eChartStartButtonImg = document.getElementById("eChartStartButtonImg");

	if (!eChartData.running) {
		// Start chart
		eChartData.start();

		// Change Button text and image
		eChartStartButtonText.innerText = "Stop";
		eChartStartButtonImg.src = "../ImageSrc/Pause.png";
	} else {
		// Stop chart
		eChartData.stop();

		// Change button text and image
		eChartStartButtonText.innerText = "Start";
		eChartStartButtonImg.src = "../ImageSrc/Play.png";
	}
}

// Update the displayed max values for each axis
function eChartUpdateAxisLabels() {
	const xAxis = document.getElementById("eChartXAxis");
	const yAxis = document.getElementById("eChartYAxis");
	const xAxisUp = document.getElementById("eChartXAxisUp");
	const xAxisDown = document.getElementById("eChartXAxisDown");
	const yAxisUp = document.getElementById("eChartYAxisUp");
	const yAxisDown = document.getElementById("eChartYAxisDown");

	// Write current max axis values
	xAxis.value = settings.eChart.xAxisMax;
	yAxis.value = settings.eChart.yAxisMax;

	// Disable/enable buttons appropriately
	xAxisUp.disabled = eChartData.xAxisUpDisabled;
	xAxisDown.disabled = eChartData.xAxisDownDisabled;
	yAxisUp.disabled = eChartData.yAxisUpDisabled;
	yAxisDown.disabled = eChartData.yAxisDownDisabled;
}

/*		Settings		*/

// Save the settings to SettingsList & Write to JSON file
function SaveSettings() {
	const xAoI = document.getElementById("AoIx");
	const yAoI = document.getElementById("AoIy");
	const xOffset = document.getElementById("xOffset");
	const yOffset = document.getElementById("yOffset");
	const exposureTime = document.getElementById("ExposureTime");
	const gain = document.getElementById("Gain");
	const gainBoost = document.getElementById("GainBoost");
	const internalTrigger = document.getElementById("InternalTrigger");
	const risingEdge = document.getElementById("RisingEdge");
	const fallingEdge = document.getElementById("FallingEdge");
	const triggerDelay = document.getElementById("TriggerDelay");
	const rawAccumulation = document.getElementById("RawAccumulation");
	const centroidAccumulation = document.getElementById("CentroidAccumulation");
	const hybridMethod = document.getElementById("HybridMethod");
	const centroidBinSize = document.getElementById("CentroidBinSize");

	settings.camera.xAoI = parseFloat(xAoI.value);
	settings.camera.yAoI = parseFloat(yAoI.value);
	settings.camera.xOffset = parseFloat(xOffset.value);
	settings.camera.yOffset = parseFloat(yOffset.value);
	settings.camera.exposureTime = parseFloat(exposureTime.value);
	settings.camera.gain = parseFloat(gain.value);
	settings.camera.gainBoost = gainBoost.checked;

	if (internalTrigger.checked) {
		settings.camera.trigger = "Internal Trigger";
	} else if (risingEdge.checked) {
		settings.camera.trigger = "Rising Edge";
	} else if (fallingEdge.checked) {
		settings.camera.trigger = "Falling Edge";
	}
	settings.camera.triggerDelay = parseFloat(triggerDelay.value);

	if (rawAccumulation.checked) {
		settings.centroid.accumulation = "Raw";
	} else if (centroidAccumulation.checked) {
		settings.centroid.accumulation = "Centroid";
	}
	settings.centroid.hybridMethod = hybridMethod.checked;
	settings.centroid.binSize = parseFloat(centroidBinSize.value);

	// Write settings to file
	settings.save();

	// Apply the settings
	ApplySettings();
}

// Get Settings from SettingsList.JSON and update values
function ReadSettingsFromFileSync() {
	const xAoI = document.getElementById("AoIx");
	const yAoI = document.getElementById("AoIy");
	const xOffset = document.getElementById("xOffset");
	const yOffset = document.getElementById("yOffset");
	const exposureTime = document.getElementById("ExposureTime");
	const gain = document.getElementById("Gain");
	const gainBoost = document.getElementById("GainBoost");
	const internalTrigger = document.getElementById("InternalTrigger");
	const risingEdge = document.getElementById("RisingEdge");
	const fallingEdge = document.getElementById("FallingEdge");
	const triggerDelay = document.getElementById("TriggerDelay");
	const rawAccumulation = document.getElementById("RawAccumulation");
	const centroidAccumulation = document.getElementById("CentroidAccumulation");
	const hybridMethod = document.getElementById("HybridMethod");
	const centroidBinSize = document.getElementById("CentroidBinSize");

	try {
		// Check if the settings file exists
		//settings.read();

		// Update settings display
		xAoI.value = settings.camera.xAoI;
		yAoI.value = settings.camera.yAoI;
		xOffset.value = settings.camera.xOffset;
		yOffset.value = settings.camera.yOffset;
		exposureTime.value = settings.camera.exposureTime;
		gain.value = settings.camera.gain;
		gainBoost.checked = settings.camera.gainBoost;
		if (settings.camera.trigger === "Internal Trigger") {
			internalTrigger.checked = true;
		} else if (settings.camera.trigger === "Rising Edge") {
			risingEdge.checked = true;
		} else if (settings.camera.trigger === "Falling Edge") {
			fallingEdge.checked = true;
		}
		triggerDelay.value = settings.camera.triggerDelay;

		if (settings.centroid.accumulation === "Raw") {
			rawAccumulation.checked = true;
		} else if (settings.centroid.accumulation === "Centroid") {
			centroidAccumulation.checked = true;
		}
		hybridMethod.checked = settings.centroid.hybridMethod;
		centroidBinSize.value = settings.centroid.binSize;
	} catch {
		// If the settings file doesn't exist, use version from mainDefinitions.js
	}
}

// Apply the settings after reading
function ApplySettings() {
	// Turn hybrid method on/off
	ipc.send("HybridMethod", settings.centroid.hybridMethod);
	// More stuff for camera control to come

	// Check electron chart button status
	eChartData.checkDisable();
}

/*


*/
/*			IPC Messages			*/
/*


*/

// Receive message with centroid data
ipc.on("new-camera-frame", function (event, centroidResults) {
	// Will return with object containing:
	//		imageBuffer			-	Uint8Buffer - Current image frame
	// 		CCLCenters			-	Array		- Connect component labeling centroids
	//		hybridCenters		-	Array		- Hybrid method centroids
	//		computationTime		-	Float		- Time to calculate centroids (ms)
	//		isLEDon				- 	Boolean		- Whether IR LED was on in image
	//		normNoiseIntensity	-	Float		- Ratio of LED area to Noise area normalized intensities

	// Update average number of electrons
	averageCount.update(centroidResults);
	UpdateAverageCountDisplays();

	// NOTE:
	// Might be better to change this so all logic is done in scanInfo / accumulatedImage
	// Maybe even combine those classes? It's getting easy to get lost

	// Only update these if currently taking a scan that isn't paused
	if (scanInfo.running && !scanInfo.paused) {
		// Update number of electrons
		scanInfo.update(centroidResults);
		UpdateScanCountDisplays();

		// Update Accumulated View
		accumulatedImage.update(centroidResults);
		if (scanInfo.method === "ir") {
			// Calculate the IR difference image
			accumulatedImage.getDifference();
		}
		UpdateAccumulatedImageDisplay();
	} else if (scanInfo.running) {
		// Switch which IR image to bin to
		//accumulatedImage.isIROn = !accumulatedImage.isIROn;
	}

	// Update eChart if it's running
	if (eChartData.running) {
		eChartData.updateData(centroidResults);
		eChartData.updateChart(eChart);
	}

	// Take single shot image if requested
	if (singleShot.toSave) {
		// Create a copy of the buffer
		singleShot.savedBuffer = [...centroidResults.imageBuffer];
		singleShot.savedCentroids = [centroidResults.CCLCenters, centroidResults.hybridCenters];
		singleShot.save();
		singleShot.toSave = false;
	}

	doit(); // Add red circle to image if enabled
});

// Update the accumulated image display
function UpdateAccumulatedImageDisplay(resetBoolean) {
	// If function is called with 'true' as argument, resets entire image
	const IRImageDisplay = document.getElementById("IRImageDisplay");
	let mainDisplay;
	let image; // Image to display
	let calculateDifference = false;
	if (scanInfo.method === "normal") {
		mainDisplay = document.getElementById("Display");
		image = accumulatedImage.normal;
	} else if (scanInfo.method === "ir") {
		switch (IRImageDisplay.selectedIndex) {
			case 0:
				// IR Off
				mainDisplay = document.getElementById("DisplayIROff");
				image = accumulatedImage.irOff;
				break;
			case 1:
				// IR On
				mainDisplay = document.getElementById("DisplayIROn");
				image = accumulatedImage.irOn;
				break;
			case 2:
				// Difference
				mainDisplay = document.getElementById("DisplayIRDifference");
				image = accumulatedImage.irDifference;
				calculateDifference = true;
				break;
		}
	}
	const mainDisplayContext = mainDisplay.getContext("2d");
	let mainDisplayData = mainDisplayContext.getImageData(0, 0, accumulatedImage.width, accumulatedImage.height);
	const mainDisplaySlider = document.getElementById("DisplaySlider1");
	let contrastValue = parseFloat(mainDisplaySlider.value);
	let contrastIncrement = contrastValue * 300;
	let pixValue;

	if (calculateDifference) {
		UpdateDifferenceImageDisplay(mainDisplayContext, mainDisplayData, contrastIncrement);
		return;
	}

	for (let Y = 0; Y < accumulatedImage.height; Y++) {
		for (let X = 0; X < accumulatedImage.width; X++) {
			pixValue = 255 - image[Y][X] * contrastIncrement;
			if (pixValue > 0) {
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 3] = pixValue;
			} else {
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 3] = 0;
			}
		}
	}
	mainDisplayContext.putImageData(mainDisplayData, 0, 0);
}

// Update display if Difference image is shown
function UpdateDifferenceImageDisplay(mainDisplayContext, mainDisplayData, contrastIncrement) {
	let pixValue;
	let augmentedPixValue;
	for (let Y = 0; Y < accumulatedImage.height; Y++) {
		for (let X = 0; X < accumulatedImage.width; X++) {
			pixValue = accumulatedImage.irDifference[Y][X];
			augmentedPixValue = Math.abs(pixValue) * contrastIncrement;
			if (augmentedPixValue < 255) {
				augmentedPixValue = augmentedPixValue;
			} else {
				augmentedPixValue = 255;
			}
			if (pixValue > 0) {
				// Display blue for positive difference
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X)] = 0;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 2] = augmentedPixValue;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 3] = 255;
			} else if (pixValue === 0) {
				// Display black for 0 difference
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X)] = 0;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 2] = 0;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 3] = 255;
			} else {
				// Display red for negative difference
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X)] = augmentedPixValue;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 2] = 0;
				mainDisplayData.data[4 * (accumulatedImage.width * Y + X) + 3] = 255;
			}
		}
	}
	mainDisplayContext.putImageData(mainDisplayData, 0, 0);
}

// Update the average counters on the e- monitor page
function UpdateAverageCountDisplays() {
	const totalAverage = document.getElementById("AvgECount");
	const cclAverage = document.getElementById("eChartCCLAvg");
	const hybridAverage = document.getElementById("eChartHybridAvg");
	const eChartTotalAverage = document.getElementById("eChartTotalAvg");
	const calcTime = document.getElementById("eChartCalcTime");

	if (averageCount.updateCounter === averageCount.updateFrequency) {
		totalAverage.value = averageCount.getTotalAverage();
		cclAverage.value = averageCount.getCCLAverage();
		hybridAverage.value = averageCount.getHybridAverage();
		eChartTotalAverage.value = averageCount.getTotalAverage();
		calcTime.value = averageCount.getCalcTimeAverage() + " ms";

		averageCount.updateCounter = 0;
	} else {
		averageCount.updateCounter++;
	}
	// Need to add bit about updating calc time
}

// Update the total frames and electron counters
function UpdateScanCountDisplays() {
	const totalFrames = document.getElementById("TotalFrames");
	const totalElectrons = document.getElementById("TotalECount");
	const totalFramesIROn = document.getElementById("TotalFramesIROn");
	const totalElectronsIROn = document.getElementById("TotalECountIROn");

	totalFrames.value = scanInfo.frameCount;
	totalElectrons.value = scanInfo.getTotalCount();
	totalFramesIROn.value = scanInfo.frameCountIROn;
	totalElectronsIROn.value = scanInfo.getTotalCountIROn();
}

// Receive message about changing Current File Save Directory
ipc.on("NewSaveDirectory", function (event, returnedDirectories) {
	const saveDirectory = document.getElementById("SaveDirectory");

	settings.saveDirectory.currentScan = returnedDirectories[0].toString();
	settings.saveDirectory.currentScanShort = returnedDirectories[1].toString();
	saveDirectory.value = settings.saveDirectory.currentScanShort;
});

ipc.on("closing-main-window", () => {
	// This works!
	// So here is where I can command it to save the settings list
	// and update previous Scans to include one if it's currently running but not saved
	// If window was closed while a scan was running, save the scan before closing
	if (scanInfo.running) {
		// Stop the scan (and auto-saving)
		scanInfo.stopScan();
		// Save the image
		//await scanInfo.saveImage();
		// Add this scan to previousScans
		previousScans.addScan();
		// Save today's previous scans to JSON file
		previousScans.saveScans();
	}
	ipc.send("closing-main-window-received", settings);
});

ipc.on("settings-information", (event, settingsInformation) => {
	//console.log(settingsInformation);
	settings = settingsInformation;
	Startup();
});

/* When update e- counters on main page, also update on e- Monitor page
	and add in an if statement whether to add to chart
	And have addon send over calc time data */

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

function doit() {
	if (doit_bool) {
		//const display = document.getElementById("Display");
		const display = document.getElementsByClassName("active-display")[0];
		const ctx = display.getContext("2d");
		let centerX = 512;
		let centerY = 512;
		let radius = 40;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = "red";
		ctx.fill();
	}
}

let doit_bool = false;
function enableDoit() {
	doit_bool = true;
}
function disableDoit() {
	//const display = document.getElementById("Display");
	//const display = document.getElementsByClassName("active-display")[0];
	display_list = document.getElementsByClassName("accumulated-image");
	for (let i = 0; i < display_list.length; i++) {
		let display = display_list[i];
		let ctx = display.getContext("2d");
		let centerX = 512;
		let centerY = 512;
		let radius = 40;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI, false);
		ctx.fillStyle = "black";
		ctx.fill();
	}
	doit_bool = false;
}

// Keep the screen awake
async function requestWakeLock() {
	try {
		wakeLock = await navigator.wakeLock.request();
		wakeLock.addEventListener("release", () => {
			console.log("Screen Wake Lock released:", wakeLock.released);
		});
		console.log("Screen Wake Lock released:", wakeLock.released);
	} catch (err) {
		console.error(`${err.name}, ${err.message}`);
	}
}
