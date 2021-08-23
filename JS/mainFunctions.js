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
	Startup();
};

// Tabs
NormalMode.onclick = function () {
	PressTabFn(NormalMode);
};
IRMode.onclick = function () {
	PressTabFn(IRMode);
};
EMonitor.onclick = function () {
	PressTabFn(EMonitor);
};
PostProcess.onclick = function () {
	PressTabFn(PostProcess);
};
Settings.onclick = function () {
	PressTabFn(Settings);
};

/*		Normal Mode		*/

// Scan Controls
StartSave.onclick = function () {
	StartSaveButtonFn();
};
Pause.onclick = function () {
	PauseButtonFn();
};
SingleShot.onclick = function () {
	SingleShotButtonFn();
};

// Save Controls
I0NCounterDown.onclick = function () {
	I0NCounterDownButtonFn();
};
I0NCounterUp.onclick = function () {
	I0NCounterUpButtonFn();
};
WavelengthMode.oninput = function () {
	WavelengthInputFn();
};
CurrentWavelength.oninput = function () {
	WavelengthInputFn();
};
ChangeSaveDirectory.onclick = function () {
	ChangeSaveDirectoryButtonFn();
};

// Display

// Control slider's display
DisplaySlider.onmouseover = function () {
	SliderMouseOverFn(0);
};
DisplaySlider.onmouseout = function () {
	SliderMouseOutFn(0);
};
DisplaySlider.oninput = function () {
	DisplaySliderFn(); // Update image contrast
	SliderMouseOverFn(0);
};

// Electron Counters
ResetCounters.onclick = function () {
	ResetCountersButtonFn();
};

/*		e- Monitor		*/

// Buttons
eChartStartStop.onclick = function () {
	eChartStartStopFn();
};
eChartReset.onclick = function () {
	eChartResetFn();
};

// Axes Controls
eChartYAxisUp.onclick = function () {
	IncreaseEChartYAxis();
};
eChartYAxisDown.onclick = function () {
	DecreaseEChartYAxis();
};
eChartXAxisUp.onclick = function () {
	IncreaseEChartXAxis();
};
eChartXAxisDown.onclick = function () {
	DecreaseEChartXAxis();
};

/*		Settings		*/

SaveSettingsButton.onclick = function () {
	SaveSettingsButtonFn();
};

/*


*/
/*			Event Listener Functions			*/
/*


*/

/*		Startup		*/

// Execute various functions on application startup
function Startup() {
	DepressTabsFn();

	// Get the settings from file
	ReadSettingsFromFileSync();

	// Apply the settings
	ApplySettings();

	// Go to Normal Mode tab
	PressTabFn(NormalMode);
	//PressTabFn(EMonitor);

	// Get todays date (formatted)
	todaysDate = getFormattedDate();

	// Update CurrentFile and CurrentDirectory displays
	CurrentFile.value = getCurrentFileName(currentFileSaveDir, todaysDate);
	SaveDirectory.value = currentFileSaveDir;

	// Find today's previous files JSON file and read
	startupReadRecentFiles();

	// Fill display and get image data
	DisplayContext.fillstyle = "black";
	DisplayContext.fillRect(0, 0, 1024, 1024);
	DisplayData = DisplayContext.getImageData(0, 0, 1024, 1024);

	// Update eChart Axes Labels
	UpdateEChartAxesLabels();

	// Start centroiding
	ipc.send("StartCentroiding", null);
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
function DepressTabsFn() {
	let tablist = [NormalMode, IRMode, EMonitor, PostProcess, Settings];
	let contentlist = [NormalModeContent, IRModeContent, EMonitorContent, PostProcessContent, SettingsContent];
	for (let i = 0; i < tablist.length; i++) {
		tablist[i].classList.remove("pressed-tab");
		contentlist[i].style.display = "none";
	}
}

// "Press" in a tab by adding the pressed-tab class to it
function PressTabFn(Tab) {
	DepressTabsFn();
	Tab.classList.add("pressed-tab");
	if (Tab === NormalMode) {
		NormalModeContent.style.display = "grid";
	} else if (Tab === EMonitor) {
		EMonitorContent.style.display = "grid";
	} else if (Tab === Settings) {
		SettingsContent.style.display = "grid";
	}
}

/*		Normal Mode		*/

// Scan Controls

// Start a scan or save it if scan is already started
function StartSaveButtonFn() {
	// Change button text
	if (StartButtonText.innerText === "Start") {
		// Reset counters
		ResetCountersButtonFn();
		totalECount = 0;

		// Reset accumulated image
		resetAccumulatedImage();

		// Start centroiding
		ScanBool = true;

		// Change button values
		StartButtonText.innerText = "Save";
		StartButtonImg.src = "../ImageSrc/Save.png";
		Pause.disabled = false; // Make Pause button clickable
		SingleShot.disabled = true; // Disable SS button
	} else if (StartButtonText.innerText === "Save") {
		// Stop the scan
		ScanBool = false;

		// Change button values
		StartButtonText.innerText = "Start";
		StartButtonImg.src = "../ImageSrc/Play.png";
		PauseButtonText.innerText = "Pause"; // Reset pause button text & image
		PauseButtonImg.src = "../ImageSrc/Pause.png";
		Pause.disabled = true; // Disable pause button
		SingleShot.disabled = false; // Enable SS button

		// Save scan information
		let saveFile = {
			fileName: CurrentFile.value,
			mode: WavelengthMode.selectedIndex,
			wavelength: CurrentWavelength.value,
			converted: ConvertedWavelength.value,
			wavenumber: CurrentWavenumber.value,
			totalFrames: TotalFrames.value,
			totalECount: TotalECount.value,
		};
		// If photon energies are out of bounds, don't save
		let WL = parseFloat(CurrentWavelength.value);
		if (100 > WL || WL > 20000) {
			saveFile.wavelength = "";
		}

		// Append to prevFiles
		prevFiles.push(saveFile);

		// Tick up increment counter
		I0NCounterUpButtonFn();

		// Update Recent File Section
		updateRecentFiles(RecentScansSection, saveFile);

		let prevFilesPrint = JSON.stringify(prevFiles);

		// Update Recent Files JSON file
		fs.writeFile(prevFileSaveDir + "/" + todaysDate + "prevFiles.json", prevFilesPrint, function (err) {
			if (err) {
				console.log(err);
			}
		});
	}
}

// Pause or resume current scan
function PauseButtonFn() {
	if (PauseButtonText.innerText === "Pause") {
		// Stop scan
		ScanBool = false;

		// Change button values
		PauseButtonText.innerText = "Resume";
		PauseButtonImg.src = "../ImageSrc/Play.png";
		SingleShot.disabled = false; // Enable SS Button
	} else if (PauseButtonText.innerText === "Resume") {
		// Start scan
		ScanBool = true;

		// Change button values
		PauseButtonText.innerText = "Pause";
		PauseButtonImg.src = "../ImageSrc/Pause.png";
		SingleShot.disabled = true; // Disable SS Button
	}
}

// Take a single image and prompt save screen
function SingleShotButtonFn() {
	console.log("Executed SS");
}

// Save Controls

// Decrease file counter increment by one
function I0NCounterDownButtonFn() {
	let currentCount = parseInt(I0NCounter.value);
	if (currentCount === 1) {
		CurrentFile.value = getCurrentFileName(currentFileSaveDir, todaysDate);
		return;
	}
	I0NCounter.value = currentCount - 1;
	CurrentFile.value = getCurrentFileName(currentFileSaveDir, todaysDate);
}

// Increase file counter increment by one
function I0NCounterUpButtonFn() {
	let currentCount = parseInt(I0NCounter.value);
	I0NCounter.value = currentCount + 1;
	CurrentFile.value = getCurrentFileName(currentFileSaveDir, todaysDate);
}

// Convert photon energy based on detachment laser setup
function WavelengthInputFn() {
	if (CurrentWavelength.value === "") {
		// No wavelength is entered, so no need to do the rest
		return;
	}

	let WL = parseFloat(CurrentWavelength.value);
	let NewWL;

	// 0 is Standard, 1 is Doubled, 2 is Raman Shifter, 3 is IR-DFG
	switch (WavelengthMode.selectedIndex) {
		case 0:
			// Standard setup, no need to convert wavelengths
			NewWL = WL;
			break;

		case 1:
			// Doubled setup, λ' = λ/2
			NewWL = WL / 2;
			break;

		case 2:
			// Raman Shifter, λ' (cm^-1) = λ (cm^-1) - 4155.201 cm^-1
			let WMi = convertNMtoWM(WL); // Convert to cm^-1
			let WMf = WMi - 4055.201; // Red-shift
			NewWL = convertWMtoNM(WMf); // Convert back to nm
			break;

		case 3:
			// IR-DFG, 1/λ' = 1/λ - 1/1064
			NewWL = 1 / (1 / WL - 1 / 1064);
			break;
	}

	// Convert to wavenumbers
	if (100 < NewWL && NewWL < 20000 && WavelengthMode.selectedIndex !== 0) {
		ConvertedWavelength.value = NewWL.toFixed(3);
		CurrentWavenumber.value = convertNMtoWM(NewWL).toFixed(2);
	} else if (100 < NewWL && NewWL < 20000 && WavelengthMode.selectedIndex === 0) {
		ConvertedWavelength.value = "";
		CurrentWavenumber.value = convertNMtoWM(NewWL).toFixed(2);
	} else {
		ConvertedWavelength.value = "";
		CurrentWavenumber.value = "";
	}
}

// Change which directory to save accumulated image to
function ChangeSaveDirectoryButtonFn() {
	ipc.send("UpdateSaveDirectory", null);
}

// Display

// Update Accumulated Image contrast
function DisplaySliderFn() {
	let contrastValue = parseFloat(DisplaySlider.value);
	let contrastIncrement = contrastValue * 100;
	for (let Y = 0; Y < 1024; Y++) {
		for (let X = 0; X < 1024; X++) {
			let AccPixValue = 255 - AccumulatedImage[Y][X] * contrastIncrement;
			if (AccPixValue > 0) {
				DisplayData.data[4 * (1024 * Y + X) + 3] = AccPixValue;
			} else {
				DisplayData.data[4 * (1024 * Y + X) + 3] = 0;
			}
		}
	}
	DisplayContext.putImageData(DisplayData, 0, 0);
}

// Create hover color change for sliders
function SliderMouseOverFn(sliderIndex) {
	let value = (100 * (Sliders[sliderIndex].value - Sliders[sliderIndex].min)) / (Sliders[sliderIndex].max - Sliders[sliderIndex].min);
	let backgroundBlue = "hsla(225, 50%, 65%, 1)";
	Sliders[sliderIndex].style.background =
		"linear-gradient(to right, " + backgroundBlue + " 0%, " + backgroundBlue + " " + value + "%, hsla(225, 20%, 25%, 1) 0%)";
}

function SliderMouseOutFn(sliderIndex) {
	Sliders[sliderIndex].style.background = "hsla(225, 20%, 25%, 1)";
}

// Electron counters

// Reset electron & frame counters
function ResetCountersButtonFn() {
	TotalFrames.value = 0;
	TotalECount.value = 0;
}

/*		e- Monitor		*/

// Start/stop the electron counter chart
function eChartStartStopFn() {
	if (eChartStartButtonText.innerText === "Start") {
		// Start chart
		eChartBool = true;

		// Change Button text and image
		eChartStartButtonText.innerText = "Stop";
		eChartStartButtonImg.src = "../ImageSrc/Pause.png";
	} else if (eChartStartButtonText.innerText === "Stop") {
		// Stop chart
		eChartBool = false;

		// Change button text and image
		eChartStartButtonText.innerText = "Start";
		eChartStartButtonImg.src = "../ImageSrc/Play.png";
	}
}

// Reset chart
function eChartResetFn() {
	let dataLength = eChart.data.labels.length;
	for (let i = 0; i < dataLength; i++) {
		eChart.data.labels.pop(); // Remove xAxis data
		eChart.data.datasets[0].data.pop(); // Remove CCL spot counts
		eChart.data.datasets[1].data.pop(); // Remove hybrid spot counts
	}
	eChart.update(); // Update chart

	frameCounter = 0; // temp thing (replace with frame counter)
}

// Increase the max value of the Y axis on the chart
function IncreaseEChartYAxis() {
	if (eChartYAxisDown.disabled) {
		// Enable YDown button if disabled
		eChartYAxisDown.disabled = false;
	}

	if (eChartMaxYAxis <= 15) {
		// Increase by 5 from 5 to 20
		eChartMaxYAxis += 5;
	} else if (eChartMaxYAxis <= 90) {
		// Increase by 10 from 20 to 100
		eChartMaxYAxis += 10;
	} else {
		// Make sure it's not more than 100
		eChartMaxYAxis = 100;
	}

	if (eChartMaxYAxis === 100) {
		// Disable YUp button
		eChartYAxisUp.disabled = true;
	}

	UpdateEChartAxesLabels();
	SaveSettingsButtonFn(); // Save the max axis values to file
}

// Decrease the max value of the Y axis on the chart
function DecreaseEChartYAxis() {
	if (eChartYAxisUp.disabled) {
		// Enable YUp if disabled
		eChartYAxisUp.disabled = false;
	}

	if (eChartMaxYAxis <= 5) {
		// Make sure it's not less than 5
		eChartMaxYAxis = 5;
	} else if (eChartMaxYAxis <= 20) {
		// Decrease by 5 from 20 to 5
		eChartMaxYAxis -= 5;
	} else {
		// Decrease by 10 from 100 to 20
		eChartMaxYAxis -= 10;
	}

	if (eChartMaxYAxis === 5) {
		// Disable YDown button
		eChartYAxisDown.disabled = true;
	}

	UpdateEChartAxesLabels();
	SaveSettingsButtonFn(); // Save the max axis values to file
}

// Decrease the max value of the X axis on the chart
// Go to updateAvgECount() in /* Various Functions */ to find implementation of eChartMaxXAxis
function IncreaseEChartXAxis() {
	if (eChartXAxisDown.disabled) {
		// Enable YDown button if disabled
		eChartXAxisDown.disabled = false;
	}

	if (eChartMaxXAxis <= 15) {
		// Increase by 5 from 5 to 20
		eChartMaxXAxis += 5;
	} else if (eChartMaxXAxis <= 90) {
		// Increase by 10 from 20 to 100
		eChartMaxXAxis += 10;
	} else if (eChartMaxXAxis <= 475) {
		// Increase by 25 from 100 to 500
		eChartMaxXAxis += 25;
	} else {
		// Make sure it's not more than 500
		eChartMaxXAxis = 500;
	}

	if (eChartMaxXAxis === 500) {
		// Disable YUp button
		eChartXAxisUp.disabled = true;
	}

	UpdateEChartAxesLabels();
	SaveSettingsButtonFn(); // Save the max axis values to file
}

// Decrease the max value of the X axis on the chart
// Go to updateAvgECount() in /* Various Functions */ to find implementation of eChartMaxXAxis
function DecreaseEChartXAxis() {
	if (eChartXAxisUp.disabled) {
		// Enable YUp if disabled
		eChartXAxisUp.disabled = false;
	}

	if (eChartMaxXAxis <= 5) {
		// Make sure it's not less than 5
		eChartMaxXAxis = 5;
	} else if (eChartMaxXAxis <= 20) {
		// Decrease by 5 from 20 to 5
		eChartMaxXAxis -= 5;
	} else {
		// Decrease by 10 from 100 to 20
		eChartMaxXAxis -= 10;
	}

	if (eChartMaxXAxis === 5) {
		// Disable YDown button
		eChartXAxisDown.disabled = true;
	}

	UpdateEChartAxesLabels();
	SaveSettingsButtonFn(); // Save the max axis values to file
}

// Update the max axis values' displays for each axis
function UpdateEChartAxesLabels() {
	eChart.options.scales.y.max = eChartMaxYAxis;
	eChartYAxis.value = eChartMaxYAxis;
	eChartXAxis.value = eChartMaxXAxis;
}

/*		Settings		*/

// Save the settings to SettingsList & Write to JSON file
function SaveSettingsButtonFn() {
	SettingsList.Camera.AoIx = parseFloat(AoIx.value);
	SettingsList.Camera.AoIy = parseFloat(AoIy.value);
	SettingsList.Camera.xOffset = parseFloat(xOffset.value);
	SettingsList.Camera.yOffset = parseFloat(yOffset.value);
	SettingsList.Camera.ExposureTime = parseFloat(ExposureTime.value);
	SettingsList.Camera.Gain = parseFloat(Gain.value);
	SettingsList.Camera.GainBoost = GainBoost.checked;
	if (InternalTrigger.checked) {
		SettingsList.Camera.Trigger = "Internal Trigger";
	} else if (RisingEdge.checked) {
		SettingsList.Camera.Trigger = "Rising Edge";
	} else if (FallingEdge.checked) {
		SettingsList.Camera.Trigger = "Falling Edge";
	}
	SettingsList.Camera.TriggerDelay = parseFloat(TriggerDelay.value);

	if (RawAccumulation.checked) {
		SettingsList.Centroid.Accumulation = "Raw";
	} else if (CentroidAccumulation.checked) {
		SettingsList.Centroid.Accumulation = "Centroid";
	}
	SettingsList.Centroid.HybridMethod = HybridMethod.checked;
	SettingsList.Centroid.BinSize = parseFloat(CentroidBinSize.value);

	SettingsList.eChart.MaxYAxis = eChartMaxYAxis;
	SettingsList.eChart.MaxXAxis = eChartMaxXAxis;

	let SettingsListJSON = JSON.stringify(SettingsList);

	fs.writeFile("./Settings/SettingsList.JSON", SettingsListJSON, function () {
		console.log("Settings Saved!");
	});

	// Apply the settings
	ApplySettings();
}

// Get Settings from SettingsList.JSON and update values
function ReadSettingsFromFileSync() {
	// Read data from file
	try {
		// Check if the settings file exists
		let JSONdata = fs.readFileSync("./Settings/SettingsList.JSON");
		let data = JSON.parse(JSONdata);
		SettingsList = data;

		AoIx.value = SettingsList.Camera.AoIx;
		AoIy.value = SettingsList.Camera.AoIy;
		xOffset.value = SettingsList.Camera.xOffset;
		yOffset.value = SettingsList.Camera.yOffset;
		ExposureTime.value = SettingsList.Camera.ExposureTime;
		Gain.value = SettingsList.Camera.Gain;
		GainBoost.checked = SettingsList.Camera.GainBoost;
		if (SettingsList.Camera.Trigger === "Internal Trigger") {
			InternalTrigger.checked = true;
		} else if (SettingsList.Camera.Trigger === "Rising Edge") {
			RisingEdge.checked = true;
		} else if (SettingsList.Camera.Trigger === "Falling Edge") {
			FallingEdge.checked = true;
		}
		TriggerDelay.value = SettingsList.Camera.TriggerDelay;

		if (SettingsList.Centroid.Accumulation === "Raw") {
			RawAccumulation.checked = true;
		} else if (SettingsList.Centroid.Accumulation === "Centroid") {
			CentroidAccumulation.checked = true;
		}
		HybridMethod.checked = SettingsList.Centroid.HybridMethod;
		CentroidBinSize.value = SettingsList.Centroid.BinSize;

		eChartMaxYAxis = SettingsList.eChart.MaxYAxis;
		eChartMaxXAxis = SettingsList.eChart.MaxXAxis;
	} catch {
		// If the settings file doesn't exist, use version from mainDefinitions.js
	}
}

// Apply the settings after reading
function ApplySettings() {
	// Turn hybrid method on/off
	ipc.send("HybridMethod", SettingsList.Centroid.HybridMethod);
}

/*


*/
/*			IPC Messages			*/
/*


*/

// Receive message with centroid data
ipc.on("LVImageUpdate", function (event, obj) {
	// Will return with object containing:
	//		imageBuffer
	//		calcCenters

	// Update average number of electrons
	updateAvgECount(obj.calcCenters);

	// Only update these if currently taking a scan
	if (ScanBool) {
		// Update number of electrons
		updateECount(obj.calcCenters);

		// Update number of frames
		updateFrameCount();

		// Update Accumulated View
		updateAccumulatedImage(obj.calcCenters);
	}
});

// Receive message about changing Current File Save Directory
ipc.on("NewSaveDirectory", function (event, arg) {
	SaveDirectory.value = arg.toString();
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
function getCurrentFileName(current_dir, todays_date) {
	let fileString = todays_date + "i" + ("0" + I0NCounter.value).slice(-2) + "_1024.i0N";
	let checked = checkCurrentFile(current_dir, fileString);
	if (checked) {
		FileTakenAlert.classList.remove("noHover");
		FileTakenAlert.style.visibility = "visible";
	} else {
		FileTakenAlert.classList.add("noHover");
		FileTakenAlert.style.visibility = "hidden";
	}
	return fileString;
}

// Check if file in Current File exists
function checkCurrentFile(current_dir, file_string) {
	let currentFile = current_dir + file_string;
	if (fs.existsSync(currentFile)) {
		return true;
	} else {
		return false;
	}
}

// Update Recent Files Section with recent scan
function updateRecentFiles(recent_scans_section, saveFile) {
	let currentMode = saveFile.mode;
	for (let key in saveFile) {
		if (currentMode == 0) {
			// If standard detachment setup, only write the inputed value
			// (i.e. use current wavelength, skip converted wavelength)
			if (saveFile[key] === saveFile.converted) {
				continue;
			}
		} else {
			// If not standard setup, only write the converted value
			// (i.e. use converted wavelength, skip current wavelength)
			if (saveFile[key] === saveFile.wavelength) {
				continue;
			}
		}

		// Skip writing the mode
		if (saveFile[key] === saveFile.mode) {
			continue;
		}

		let tag = document.createElement("p");
		let text = document.createTextNode(saveFile[key].toString());
		tag.appendChild(text);
		recent_scans_section.appendChild(tag);
	}
}

// On startup, check if there is already a json file for today and read it
function startupReadRecentFiles() {
	let fileName = prevFileSaveDir + "/" + todaysDate + "prevFiles.json";
	let incValue = parseFloat(I0NCounter.value);
	// Check if that file exists
	fs.stat(fileName, function (err, stats) {
		if (err) {
			console.log(err);
		} else {
			// Read it
			fs.readFile(fileName, function (err, JSONdata) {
				let data = JSON.parse(JSONdata);
				// Update I0NCounter
				incValue += data.length;
				I0NCounter.value = incValue;
				CurrentFile.value = getCurrentFileName(currentFileSaveDir, todaysDate);
				// Make wavelength mode and wavelength the one previously used
				let currentMode = data[data.length - 1].mode;
				WavelengthMode.selectedIndex = currentMode;
				let CWL = data[data.length - 1].wavelength;
				CurrentWavelength.value = CWL;
				WavelengthInputFn();
				// Update prevFiles
				for (let i = 0; i < data.length; i++) {
					prevFiles.push(data[i]);
					updateRecentFiles(RecentScansSection, data[i]);
				}
			});
		}
	});
}

// Update accumulated image
function updateAccumulatedImage(calcCenters) {
	let contrastValue = parseFloat(DisplaySlider.value);
	let contrastIncrement = contrastValue * 100;
	for (let k = 0; k < 2; k++) {
		for (let i = 0; i < calcCenters[0].length; i++) {
			let xCenter = Math.round((calcCenters[0][i][0] * 4.0) / 3.0);
			let yCenter = Math.round((calcCenters[0][i][1] * 4.0) / 3.0);
			AccumulatedImage[yCenter][xCenter]++;

			// Update image
			let AccPixValue = 255 - AccumulatedImage[yCenter][xCenter] * contrastIncrement;
			if (AccPixValue > 0) {
				DisplayData.data[4 * (1024 * yCenter + xCenter) + 3] = AccPixValue;
			} else {
				DisplayData.data[4 * (1024 * yCenter + xCenter) + 3] = 0;
			}
		}
	}
	// Send updated image to screen
	DisplayContext.putImageData(DisplayData, 0, 0);
}

function resetAccumulatedImage() {
	// Reset accumulated image
	AccumulatedImage = Array.from(Array(1024), () => new Array(1024).fill(0));

	// Reset accumulated image display
	for (let i = 0; i < 1024 * 1024; i++) {
		DisplayData.data[4 * i + 3] = 255;
	}
	DisplayContext.putImageData(DisplayData, 0, 0);
}

// Update total electron counter
function updateECount(calcCenters) {
	let CCLCount = calcCenters[0].length;
	let HybridCount = calcCenters[1].length;
	let eCount = CCLCount + HybridCount;
	totalECount += eCount;
	TotalECount.value = getSciNot(totalECount); // Push current total electron count to normal mode screen
}

// Update average electron counter
function updateAvgECount(calcCenters) {
	// Get electron counts
	let CCLCount = calcCenters[0].length;
	let HybridCount = calcCenters[1].length;
	let eCount = CCLCount + HybridCount;

	// Add to respective arrays
	PreviousCCLCounts.push(CCLCount);
	PreviousHybridCounts.push(HybridCount);
	PreviousElectronCounts.push(eCount);

	// Make sure arrays are only 10 frames long
	if (PreviousCCLCounts.length > 10) {
		PreviousCCLCounts.shift();
	}
	if (PreviousHybridCounts.length > 10) {
		PreviousHybridCounts.shift();
	}
	if (PreviousElectronCounts.length > 10) {
		PreviousElectronCounts.shift();
	}

	// Update averages if avgUpdateCounter is large enough
	if (avgUpdateCounter === 5) {
		// Get averages and push to counters
		let avgCCLECount = getAvg(PreviousCCLCounts).toFixed(2);
		let avgHybridECount = getAvg(PreviousHybridCounts).toFixed(2);
		let avgTotalECount = getAvg(PreviousElectronCounts).toFixed(2);
		eChartCCLAvg.value = avgCCLECount;
		eChartHybridAvg.value = avgHybridECount;
		eChartTotalAvg.value = avgTotalECount;
		AvgECount.value = avgTotalECount;

		// Reset avgUpdateCounter
		avgUpdateCounter = 0;
	}

	// Add electron counts to eChart if started
	if (eChartBool) {
		eChart.data.labels.push(frameCounter);
		eChart.data.datasets[0].data.push(CCLCount); // Add single spot count
		eChart.data.datasets[1].data.push(CCLCount + HybridCount); // Add overlapping spot count
		frameCounter++;

		// Make sure chart only contains certain number of data points
		while (eChart.data.datasets[0].data.length > eChartMaxXAxis) {
			eChart.data.labels.shift(); // Delete first data point from array
			eChart.data.datasets[0].data.shift();
			eChart.data.datasets[1].data.shift();
		}

		eChart.update("none"); // Update chart
	}

	// Update average update counter
	avgUpdateCounter++;
}

// Update total frame counter
function updateFrameCount() {
	let totalFrames = parseFloat(TotalFrames.value);
	totalFrames++;
	TotalFrames.value = totalFrames;
}

// Convert wavelength in nm to wavenumbers
function convertNMtoWM(wavelength) {
	return Math.pow(10, 7) / wavelength;
}

// Convert wavenumbers to wavelength in nm
function convertWMtoNM(wavenumber) {
	// It's the same as NMtoWM, but I think it's easier to read the code this way
	return Math.pow(10, 7) / wavenumber;
}

// Get num in scientific notation
function getSciNot(num, decimalPlaces) {
	// Default decimal places is 3;
	let decPlaces = decimalPlaces || 3;
	if (num < 1) {
		// If exponent is negative, do nothing
		return num.toExponential(decPlaces).toString();
	} else {
		numStr = num.toExponential(decPlaces).toString();
		numStr = numStr.substr(0, numStr.length - 2) + numStr.slice(-1);
		return numStr;
	}
}

// Get average value of an array
function getAvg(arr) {
	let sum = 0;
	arr.forEach(function (val) {
		sum += val;
	});
	return sum / arr.length;
}
