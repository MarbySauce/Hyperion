/*
	This is a list of all globally defined variables used in Main Window Renderer
*/

// Libraries
const fs = require("fs");
const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");
// Addon libraries
//const wavemeter = require("bindings")("wavemeter");
const melexir = require("bindings")("melexir");

// To be filled in after main process reads
// settings from file
let settings;

const scanInfo = {
	running: false, // running does not change if scan is paused
	paused: false,
	method: "normal", // Can be "normal", "ir", or "depletion"
	frameCount: 0,
	frameCountIROn: 0,
	cclCount: 0,
	hybridCount: 0,
	totalCount: 0,
	totalCountIROn: 0,
	fileName: "",
	fileNameIR: "",
	autoSaveTimer: 100000, // in ms, time between auto saves
	autoSave: false,
	hasBeenSaved: false,
	startScan: function () {
		this.running = true;
		this.autoSave = true;
		this.autoSaveLoop();
	},
	stopScan: function () {
		this.running = false;
		this.autoSave = false;
	},
	saveImage: function () {
		// Save the image
		let saveLocation = settings.saveDirectory.currentScan + "/" + this.fileName;
		// Temporary file to store to in case app crashes while writing,
		// previous autosaved file will not be ruined
		let tempSaveLocation = settings.saveDirectory.currentScan + "/temp.txt";
		let imageString;
		if (scanInfo.method === "ir") {
			imageString = accumulatedImage.convertToString("irOff");
		} else {
			imageString = accumulatedImage.convertToString("normal");
		}

		// Write the image to a temp file first, then rename that file
		// to appropriate file name
		// Renaming takes ~0.5 ms, so very small chance of app crashing during
		fs.writeFile(tempSaveLocation, imageString, (err) => {
			if (err) {
				console.log(err);
			} else {
				fs.rename(tempSaveLocation, saveLocation, (err) => {
					if (err) {
						console.log(err);
					} else {
						console.log("Saved!");
					}
				});
			}
		});
		if (this.method === "ir") {
			// Save the IR method
			let saveLocationIR = settings.saveDirectory.currentScan + "/" + this.fileNameIR;
			// Temporary file to store to in case app crashes while writing,
			// previous autosaved file will not be ruined
			let tempSaveLocationIR = settings.saveDirectory.currentScan + "/tempIR.txt";
			let imageStringIR = accumulatedImage.convertToString("irOn");
			fs.writeFile(tempSaveLocationIR, imageStringIR, (err) => {
				if (err) {
					console.log(err);
				} else {
					fs.rename(tempSaveLocationIR, saveLocationIR, (err) => {
						if (err) {
							console.log(err);
						} else {
							console.log("IR Saved!");
						}
					});
				}
			});
		}
		this.hasBeenSaved = true;
		// Add this to previousScans
		previousScans.addScan();
		// Save previousScans to JSON file
		previousScans.saveScans();
	},
	autoSaveLoop: function () {
		// Loop used to autosave images
		setTimeout(() => {
			// Make sure we still want to autosave the file
			if (this.autoSave) {
				// Start the next timer
				this.autoSaveLoop();
				if (!this.paused) {
					// Save the image
					// Don't need to save if we're paused, but we should
					// stay in this loop
					this.saveImage();
				}
			}
		}, this.autoSaveTimer);
	},
	update: function (centroidResults) {
		let ccl = centroidResults.CCLCenters.length;
		let hybrid = centroidResults.hybridCenters.length;
		let total = ccl + hybrid;
		// Add to counts
		this.cclCount += ccl;
		this.hybridCount += hybrid;
		switch (this.method) {
			case "normal":
				this.totalCount += total;
				this.frameCount++;
				break;
			case "ir":
				//if (accumulatedImage.isIROn) {
				if (centroidResults.isLEDon) {
					this.totalCountIROn += total;
					this.frameCountIROn++;
				} else {
					this.totalCount += total;
					this.frameCount++;
				}
				break;
		}
	},
	reset: function () {
		this.frameCount = 0;
		this.cclCount = 0;
		this.hybridCount = 0;
		this.totalCount = 0;
		this.frameCountIROn = 0;
		this.totalCountIROn = 0;
	},
	getFrames: function () {
		// Returns frame count as "X k" (e.g. 11 k for 11,000 frames)
		// unless frame count is below 1,000
		let frameString;
		if (this.frameCount >= 1000) {
			frameString = Math.round(this.frameCount / 1000) + " k";
		} else {
			frameString = this.frameCount.toString();
		}
		return frameString;
	},
	getFramesIROn: function () {
		// Returns frame count as "X k" (e.g. 11 k for 11,000 frames)
		// unless frame count is below 1,000
		let frameString;
		if (this.frameCountIROn >= 1000) {
			frameString = Math.round(this.frameCountIROn / 1000) + " k";
		} else {
			frameString = this.frameCountIROn.toString();
		}
		return frameString;
	},
	getTotalCount: function () {
		// Returns total electron count in scientific notation
		// unless total count is below 10,000
		let countString;
		if (this.totalCount >= 10000) {
			countString = this.totalCount.toExponential(3).toString();
			// Get rid of '+' in exponent
			countString = countString.substr(0, countString.length - 2) + countString.slice(-1);
		} else {
			countString = this.totalCount.toString();
		}
		return countString;
	},
	getTotalCountIROn: function () {
		// Returns total electron count in scientific notation
		// unless total count is below 10,000
		let countString;
		if (this.totalCountIROn >= 10000) {
			countString = this.totalCountIROn.toExponential(3).toString();
			// Get rid of '+' in exponent
			countString = countString.substr(0, countString.length - 2) + countString.slice(-1);
		} else {
			countString = this.totalCountIROn.toString();
		}
		return countString;
	},
};

const accumulatedImage = {
	originalWidth: 1024, // Size of captured image (px)
	originalHeight: 768,
	AoIWidth: 768, // Size of centroided Area of Interest
	AoIHeight: 768,
	width: 1024, // Size of accumulated image (px)
	height: 1024,
	imageCenterX: 525, // Center of accumulated image (px)
	imageCenterY: 517, // These first three should prolly be saved in settings
	depletionPlotLength: 300,
	depletionLowerBound: 130,
	depletionUpperBound: 155,
	normal: [],
	irOff: [],
	irOn: [],
	isIROn: false, // Decides which IR accumulated image to bin to
	irDifference: [],
	differenceFrequency: 20, // Number of frames before the difference image is calculated
	differenceCounter: 0, // Counter of number of frames since last diff image calculation
	dumbCounter: 0,
	allCenters: [],
	update: function (centroidResults) {
		// NOTE: Could add in stuff so that the "use hybrid" setting is used here
		// 		rather than on C++ side
		let calculatedCenters = [centroidResults.CCLCenters, centroidResults.hybridCenters];
		let numberOfCenters;
		let xCenter;
		let yCenter;

		for (let centroidMethod = 0; centroidMethod < 2; centroidMethod++) {
			numberOfCenters = calculatedCenters[centroidMethod].length;
			for (let center = 0; center < numberOfCenters; center++) {
				xCenter = calculatedCenters[centroidMethod][center][0];
				yCenter = calculatedCenters[centroidMethod][center][1];
				// Add spots to allCenters
				//this.allCenters.push([xCenter, yCenter]);
				// Expand image to correct bin size and round
				xCenter = Math.round((xCenter * this.width) / this.AoIWidth);
				yCenter = Math.round((yCenter * this.height) / this.AoIHeight);
				// Use switch statement to decide which image to add spots to
				switch (scanInfo.method) {
					case "normal":
						// Add to normal mode image
						this.normal[yCenter][xCenter]++;
						break;

					case "ir":
						// Add to IR images
						//if (this.isIROn) {
						if (centroidResults.isLEDon) {
							this.irOn[yCenter][xCenter]++;
						} else {
							this.irOff[yCenter][xCenter]++;
						}
						break;
				}
			}
		}
		// Bin to other IR image next frame
		//this.isIROn = !this.isIROn;
	},
	convertToString: function (image) {
		// Convert the accumulated image to a printable string
		// where each element in a row is separated with a space
		// and each row is separated with a new line
		// Image can be "normal", "irOn", "irOff", or "irDifference"
		let arrayToWrite; // Will be the array that is used
		switch (image) {
			case "normal":
				arrayToWrite = this.normal;
				break;

			case "irOn":
				arrayToWrite = this.irOn;
				break;

			case "irOff":
				arrayToWrite = this.irOff;
				break;

			case "irDifference":
				arrayToWrite = this.irDifference;
				break;

			case "centers":
				arrayToWrite = this.allCenters;
				break;
		}
		return arrayToWrite.map((row) => row.join(" ")).join("\n");
	},
	getDifference: function () {
		// Calculates the difference image for IR
		// i.e. IR on image - IR off image
		// Need to add a thing where positive values are red
		// and negative values are blue when displayed
		//
		// Should either change to or add in a feature where
		// an imgData is taken as parameter so that the image
		// can be displayed with this function (or just return a uint8 array)
		let pixelDifference;
		if (this.differenceCounter === this.differenceFrequency) {
			// Reset difference image
			this.irDifference = Array.from(Array(this.height), () => new Array(this.width).fill(0));
			// Calculate each pixel
			for (let Y = 0; Y < this.height; Y++) {
				for (let X = 0; X < this.height; X++) {
					pixelDifference = this.irOn[Y][X] - this.irOff[Y][X];
					this.irDifference[Y][X] = pixelDifference;
				}
			}
			// Reset difference counter
			this.differenceCounter = 0;
		} else {
			// Tick the difference counter by 1 frame
			this.differenceCounter++;
		}
	},
	getIntensityPlot: function () {
		//
		// Current issue: IR Images don't display on Depletion mode
		//
		const irOffIntensity = new Array(this.depletionPlotLength).fill(0);
		const irOnIntensity = new Array(this.depletionPlotLength).fill(0);
		const radius = Array.from({ length: this.depletionPlotLength }, (v, i) => i);
		let r; // Calculated radius
		for (let Y = 0; Y < this.height; Y++) {
			for (let X = 0; X < this.width; X++) {
				if (this.irOff[Y][X] > 0 || this.irOn[Y][X] > 0) {
					r = Math.sqrt(Math.pow(Y - this.imageCenterY, 2) + Math.pow(X - this.imageCenterX, 2));
					if (r < this.depletionPlotLength) {
						irOffIntensity[Math.round(r)] += this.irOff[Y][X];
						irOnIntensity[Math.round(r)] += this.irOn[Y][X];
					}
				}
			}
		}
		return [irOffIntensity, irOnIntensity];
	},
	getDepletion: function () {
		// First calculate Intensity(R)
		// Returns [irOff, irOn]
		let irIntensities = this.getIntensityPlot();
		// Calculate area under curve within set depletion bounds
		let irOffSum = 0;
		let irOnSum = 0;
		let percentDepletion;
		let stringToPrint;
		// Getting time of calculation
		let currentdate = new Date();
		let datetime =
			currentdate.getDate() +
			"/" +
			(currentdate.getMonth() + 1) +
			"/" +
			currentdate.getFullYear() +
			" @ " +
			currentdate.getHours() +
			":" +
			currentdate.getMinutes() +
			":" +
			currentdate.getSeconds();
		for (let R = this.depletionLowerBound; R <= this.depletionUpperBound; R++) {
			irOffSum += irIntensities[0][R];
			irOnSum += irIntensities[1][R];
		}
		percentDepletion = (100 * (irOffSum - irOnSum)) / irOffSum;
		stringToPrint = "Percent Depletion: " + percentDepletion.toFixed(2).toString() + "%";
		stringToPrint += "\nCalculated " + datetime;
		stringToPrint += "\nFrame Count: " + scanInfo.frameCount.toString();
		console.log(stringToPrint);
		//return [irOffSum, irOnSum];
	},
	reset: function (image) {
		// Resets the selected accumulated image
		// calling with no argument or with "all" resets all four

		// NOTE:
		// Should prolly change this from a switch statement to just doing this[image]
		// if image is "normal" etc
		// and just catching for resetting all images

		let imageCase = image || "all";
		switch (imageCase) {
			case "normal":
				// Reset normal image
				this.normal = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				break;

			case "irOff":
				// Reset IR off image
				this.irOff = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				break;

			case "irOn":
				// Reset IR on image
				this.irOn = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				break;

			case "irDifference":
				// Reset IR difference image
				this.irDifference = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				break;

			case "all":
				this.normal = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				this.irOff = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				this.irOn = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				this.irDifference = Array.from(Array(this.height), () => new Array(this.width).fill(0));
				this.allCenters = [];
				break;
		}

		// Reset the difference counter
		this.differenceCounter = 0;
	},
	setOriginalSize: function (width, height) {
		// Changes the size parameters of the captured image
		if (isNaN(width) || isNaN(height)) {
			// If arguments aren't numbers, do nothing
			return;
		}
		this.originalWidth = width;
		this.originalHeight = height;
	},
	setSize: function (width, height) {
		// Changes the size parameters of the accumulated image
		if (isNaN(width) || isNaN(height)) {
			// If arguments aren't numbers, do nothing
			return;
		}
		this.width = width;
		this.height = height;
	},
};

const averageCount = {
	prevCCLCounts: [],
	prevHybridCounts: [],
	prevTotalCounts: [],
	prevCalcTimes: [],
	LEDIntensities: [],
	avgPixIntensity: new Array(550).fill(0),
	avgPixIntCount: new Array(550).fill(0),
	avgNormPixInt: new Array(550).fill(0),
	updateCounter: 0, // Used to keep track of how many frames have
	// been processed since the last time avg display was updated
	updateFrequency: 10, // Number of frames before updating display
	update: function (centroidResults) {
		let results = [
			centroidResults.CCLCenters.length,
			centroidResults.hybridCenters.length,
			centroidResults.CCLCenters.length + centroidResults.hybridCenters.length,
			centroidResults.computationTime,
			centroidResults.normLEDIntensity / centroidResults.normNoiseIntensity,
		];
		let arrays = [this.prevCCLCounts, this.prevHybridCounts, this.prevTotalCounts, this.prevCalcTimes, this.LEDIntensities];

		for (let i = 0; i < results.length; i++) {
			this.add(arrays[i], results[i]);
		}

		this.updateAvgInt(centroidResults);
	},
	add: function (arr, el) {
		// Adds element el to array arr and keeps arr at 10 elements
		arr.push(el);
		while (arr.length > 10) {
			arr.shift();
		}
	},
	getAverage: function (arr) {
		// Calculates the average value of the arrays
		const sum = arr.reduce((accumulator, currentValue) => {
			return accumulator + currentValue;
		});
		return sum / arr.length;
	},
	getCCLAverage: function () {
		return this.getAverage(this.prevCCLCounts).toFixed(2);
	},
	getHybridAverage: function () {
		return this.getAverage(this.prevHybridCounts).toFixed(2);
	},
	getTotalAverage: function () {
		return this.getAverage(this.prevTotalCounts).toFixed(2);
	},
	getCalcTimeAverage: function () {
		return this.getAverage(this.prevCalcTimes).toFixed(1);
	},
	getLEDIntensityAverage: function () {
		// If the LED is off, the LED / Noise area ratio statistically should be 1
		// We don't care about that, so filter those out
		let IROnIntensities = this.LEDIntensities.filter((el) => Math.round(el) !== 1);
		return this.getAverage(IROnIntensities).toFixed(2);
	},
	resetAvgInt: function () {
		this.avgPixIntensity = new Array(550).fill(0);
		this.avgPixIntCount = new Array(550).fill(0);
		this.avgNormPixInt = new Array(550).fill(0);
	},
	updateAvgInt: function (centroidResults) {
		let calculatedCenters = [centroidResults.CCLCenters, centroidResults.hybridCenters];
		let numberOfCenters;
		let xCenter;
		let yCenter;
		let avgInt;
		let r;

		for (let centroidMethod = 0; centroidMethod < 2; centroidMethod++) {
			numberOfCenters = calculatedCenters[centroidMethod].length;
			for (let center = 0; center < numberOfCenters; center++) {
				xCenter = calculatedCenters[centroidMethod][center][0];
				yCenter = calculatedCenters[centroidMethod][center][1];
				avgInt = calculatedCenters[centroidMethod][center][2];
				r = Math.round(Math.sqrt(Math.pow(accumulatedImage.imageCenterX - xCenter, 2) + Math.pow(accumulatedImage.imageCenterY - yCenter, 2)));
				this.avgPixIntensity[r] += avgInt;
				this.avgPixIntCount[r]++;
				this.avgNormPixInt[r] = this.avgPixIntensity[r] / this.avgPixIntCount[r];
			}
		}
	},
	smoothAvgInt: function () {
		for (let i = 1; i < 550 - 1; i++) {
			this.avgNormPixInt[i] = (this.avgNormPixInt[i - 1] + this.avgNormPixInt[i] + this.avgNormPixInt[i + 1]) / 3;
		}
	},
	displayAvgInt: function () {
		this.smoothAvgInt();
		const radius = Array.from({ length: 550 }, (v, i) => i);
		IntensityGraph.data.labels = radius;
		IntensityGraph.data.datasets[0].data = this.avgNormPixInt;
		IntensityGraph.update("none");
	},
};

const laserInfo = {
	inputWavelength: null,
	detachmentMode: 0, // 0 is Standard, 1 is Doubled, 2 is Raman Shifter, 3 is IR-DFG
	convertedWavelength: null,
	convertedWavenumber: null,
	YAGFundamental: 1064.486, // Wavelength of Nd:YAG used for OPO/A (Measured 4/12/22)
	nIRWavelength: null,
	IRMode: 0, // 0 is nIR, 1 is iIR, 2 is mIR, 3 is fIR
	IRConvertedWavelength: null,
	IRConvertedWavenumber: null,
	updateWavelength: function (wavelength) {
		// Update input wavelength
		// wavelength should be a number in units of nm
		if (100 < wavelength && wavelength < 20000) {
			this.inputWavelength = wavelength;
		} else {
			this.inputWavelength = null;
		}
	},
	updateMode: function (mode) {
		// Update detachment mode based on user input
		// 0 is Standard, 1 is Doubled, 2 is Raman Shifter, 3 is IR-DFG
		if (0 <= mode && mode <= 3) {
			this.detachmentMode = mode;
		} else {
			// If mode is out of bounds, default to standard
			this.detachmentMode = 0;
		}
	},
	convert: function () {
		// Convert wavelength based on detachment mode
		// As well as convert to wavenumbers
		let convertedWavelength;

		if (this.inputWavelength == null || isNaN(this.inputWavelength)) {
			// No input wavelength
			// Clear converted energies and return
			this.convertedWavelength = null;
			this.convertedWavenumber = null;
			return;
		}
		// Convert wavelength based on mode
		switch (this.detachmentMode) {
			case 0:
				// Standard setup, no need to convert wavelengths
				convertedWavelength = null;
				break;

			case 1:
				// Doubled setup, λ' = λ/2
				convertedWavelength = this.inputWavelength / 2;
				break;

			case 2:
				// Raman shifter, ν' (cm^-1) = ν (cm^-1) - νH2 (cm^-1)
				// where νH2 (cm^-1) = 4055.201 cm^-1
				// Equivalent to λ' = (λΗ2 (nm) * λ) / (λΗ2 (nm) - λ (nm))
				// where λΗ2 (nm) = 2465.969 nm (H2 Raman line)
				const H2Wavelength = 2465.969;

				convertedWavelength = (H2Wavelength * this.inputWavelength) / (H2Wavelength - this.inputWavelength);
				break;

			case 3:
				// IR-DFG, 1/(λ' (nm)) = 1/(λ (nm)) - 1/(λYAG (nm))
				// equivalent to λ' (nm) = (λYAG (nm) * λ (nm)) / (λYAG (nm) - λ (nm))
				// where λYAG = 1064 nm (YAG fundamental)
				const YAGWavelength = 1064;

				convertedWavelength = (YAGWavelength * this.inputWavelength) / (YAGWavelength - this.inputWavelength);
				break;
		}
		// Convert to wavenumbers
		if (convertedWavelength == null) {
			// Only need to convert the input wavelength
			this.convertedWavenumber = Math.pow(10, 7) / this.inputWavelength;
		} else {
			// Need to convert based on the new wavelength
			this.convertedWavenumber = Math.pow(10, 7) / convertedWavelength;
		}
		// Update converted wavelength
		this.convertedWavelength = convertedWavelength;
	},
	updateIRWavelength: function (IRWavelength) {
		// Update input nIR wavelength
		// wavelength should be a number in units of nm
		// OPO is limited to 710 nm - 880 nm
		if (100 < IRWavelength && IRWavelength < 1000) {
			this.nIRWavelength = IRWavelength;
		} else {
			this.nIRWavelength = null;
		}
	},
	updateIRMode: function (IRMode) {
		// Update IR mode based on user input
		// 0 is near IR, 1 is intermediate IR, 2 is mid IR, 3 is far IR
		if (0 <= IRMode && IRMode <= 3) {
			this.IRMode = IRMode;
		} else {
			// If mode is out of bounds, default to nIR
			this.IRMode = 0;
		}
	},
	convertIR: function () {
		// Convert wavelength based on IR mode
		// As well as convert to wavenumbers
		let convertedWavelength;

		if (this.nIRWavelength == null || isNaN(this.nIRWavelength)) {
			// No input wavelength
			// Clear converted energies and return
			this.IRConvertedWavelength = null;
			this.IRConvertedWavenumber = null;
			return;
		}
		// Convert wavelength based on mode
		switch (this.IRMode) {
			case 0:
				// nIR mode, no need to convert wavelengths
				convertedWavelength = null;
				break;

			case 1:
				// iIR mode, calculate idler out of OPO
				convertedWavelength = (this.nIRWavelength * this.YAGFundamental) / (2 * this.nIRWavelength - this.YAGFundamental);
				break;

			case 2:
				// mIR mode, calculate idler out of OPA
				convertedWavelength = (this.nIRWavelength * this.YAGFundamental) / (this.YAGFundamental - this.nIRWavelength);
				break;

			case 3:
				// NOTE: Need to add in something that limits the nIR range to ~725-765 nm when using fIR
				//		such as making the font red + adding a note
				// fIR mode, calculate DFG of iIR - mIR
				convertedWavelength = (this.nIRWavelength * this.YAGFundamental) / (3 * this.nIRWavelength - 2 * this.YAGFundamental);
				break;
		}
		// Convert to wavenumbers
		if (convertedWavelength == null) {
			// Only need to convert the input wavelength
			//
			this.IRConvertedWavenumber = Math.pow(10, 7) / this.nIRWavelength;
		} else {
			// Need to convert based on the new wavelength
			this.IRConvertedWavenumber = Math.pow(10, 7) / convertedWavelength;
		}
		// Update converted wavelength
		this.IRConvertedWavelength = convertedWavelength;
	},
};

const previousScans = {
	allScans: [],
	recentScan: undefined,
	displayedScans: 0, // Number of scans currently displayed
	addScan: function () {
		// Add a saved scan to the previous scans list
		let repeatedFileNameIndex;
		let scanInformation;
		if (scanInfo.method === "ir") {
			scanInformation = {
				fileName: scanInfo.fileName,
				fileNameIR: scanInfo.fileNameIR,
				detachmentMode: laserInfo.detachmentMode,
				inputWavelength: laserInfo.inputWavelength,
				convertedWavelength: laserInfo.convertedWavelength,
				convertedWavenumber: laserInfo.convertedWavenumber,
				IRMode: laserInfo.IRMode,
				nIRWavelength: laserInfo.nIRWavelength,
				IRConvertedWavelength: laserInfo.IRConvertedWavelength,
				IRConvertedWavenumber: laserInfo.IRConvertedWavenumber,
				totalFrames: scanInfo.getFrames(),
				totalFramesIR: scanInfo.getFramesIROn(),
				totalCount: scanInfo.getTotalCount(),
				totalCountIR: scanInfo.getTotalCountIROn(),
				displayIndex: this.displayedScans,
			};
			this.displayedScans += 2;
		} else {
			scanInformation = {
				fileName: scanInfo.fileName,
				detachmentMode: laserInfo.detachmentMode,
				inputWavelength: laserInfo.inputWavelength,
				convertedWavelength: laserInfo.convertedWavelength,
				convertedWavenumber: laserInfo.convertedWavenumber,
				totalFrames: scanInfo.getFrames(),
				totalCount: scanInfo.getTotalCount(),
				displayIndex: this.displayedScans,
			};
			this.displayedScans++;
		}
		// Check if that filename has been used before
		// (i.e. that file was overwritten)
		repeatedFileNameIndex = this.allScans.findIndex((scan) => scan.fileName === scanInfo.fileName);
		// Add to all scans list first
		this.allScans.push(scanInformation);
		// Then remove earlier scan if there was a duplicate
		// findIndex returns -1 if it found no duplicates
		if (repeatedFileNameIndex !== -1) {
			// An earlier scan was overwritten
			// Need to also overwrite previousScans
			// splice(i, n) removes the i'th element n times
			this.allScans.splice(repeatedFileNameIndex, 1);
			// Remove that scan from the recent scans display as well
			//RemoveScanFromDisplay(repeatedFileNameIndex);
		}
		// Make this scan the most recent scan
		this.recentScan = scanInformation;
		// Remove all scans from display, sort previousScans, and re-add
		RemoveAllScansFromDisplay();
		AddAllScansToDisplay();
	},
	saveScans: function () {
		// Save previous scans information to JSON file
		let JSONFileName = settings.saveDirectory.previousScans + "/" + getFormattedDate() + "_PreviousScans.json";
		let JSONString = JSON.stringify(this.allScans);

		fs.writeFile(JSONFileName, JSONString, (err) => {
			if (err) {
				console.log(err);
			}
		});
	},
	readScans: function () {
		// Read the scans from today's JSON file if it exists
		let JSONFileName = settings.saveDirectory.previousScans + "/" + getFormattedDate() + "_PreviousScans.json";
		let JSONData; // Data extracted from JSON file
		// Check if that file exists
		fs.stat(JSONFileName, (err) => {
			if (err) {
				// File doesn't exist, start file counter at 1
				// Can be accomplished by decreasing I0N counter (since it's min is 1)
				I0NCounterDown();
			} else {
				// File exists, read it and get previous scan information
				fs.readFile(JSONFileName, (err, fileData) => {
					JSONData = JSON.parse(fileData);
					// Add scans to previous scans list
					this.allScans = JSONData;
					for (let i = 0; i < JSONData.length; i++) {
						UpdateRecentFiles(JSONData[i]); // Update recent files section
						I0NCounterUp(); // Increase I0N increment to account for previous scans
					}
					// Set recent scan to last scan in file
					this.recentScan = JSONData[JSONData.length - 1];
					// Set laser detachment mode and wavelength to that of recent scan
					laserInfo.updateMode(this.recentScan.detachmentMode);
					laserInfo.updateWavelength(this.recentScan.inputWavelength);
					laserInfo.convert();
					// Do the same for IR
					laserInfo.updateIRMode(this.recentScan.IRMode);
					laserInfo.updateIRWavelength(this.recentScan.nIRWavelength);
					laserInfo.convertIR();
					// Update laser info display
					UpdateLaserWavelengthInput();
					UpdateLaserWavelength();
				});
			}
		});
	},
	sort: function () {
		// Sort this.allScans by fileName
		this.allScans.sort(function (a, b) {
			let fileNameA = a.fileName;
			let fileNameB = b.fileName;
			if (fileNameA > fileNameB) {
				return 1;
			} else if (fileNameA < fileNameB) {
				return -1;
			}
			// else
			return 0;
		});
	},
};

const singleShot = {
	toSave: false,
	savedBuffer: [],
	savedCentroids: [],
	fileName: "singleShot.txt",
	centroidsFileName: "ssCentroids.txt",
	convertImageToString: function () {
		// Convert the buffer to a printable string
		// where each element in a row is separated with a space
		// and each row is separated with a new line
		// and RGB values are ignored
		let arrayToWrite = Array.from(Array(accumulatedImage.originalHeight), () => new Array(accumulatedImage.originalWidth).fill(0));
		for (let Y = 0; Y < accumulatedImage.originalHeight; Y++) {
			for (let X = 0; X < accumulatedImage.originalWidth; X++) {
				let alphaIndex = 4 * (accumulatedImage.originalWidth * Y + X) + 3;
				// Image buffer is inverted, so we need to take the difference
				arrayToWrite[Y][X] = 255 - this.savedBuffer[alphaIndex];
			}
		}
		return arrayToWrite.map((row) => row.join(" ")).join("\n");
	},
	convertCentroidsToString: function () {
		// Convert calcCenters array to a printable string
		// With centers printed as two columns: X Y
		// Separated by "CCL Centroids" and "Hybrid Centroids" as headers
		let printString = "";
		const headers = ["CCL Centroids", "Hybrid Centroids"];
		for (let i = 0; i < 2; i++) {
			printString += headers[i] + "\n";
			printString += this.savedCentroids[i].map((row) => row.join(" ")).join("\n") + "\n";
		}
		return printString;
	},
	save: function () {
		// Save the image
		let imageSaveLocation = settings.saveDirectory.currentScan + "/" + this.fileName;
		let centroidSaveLocation = settings.saveDirectory.currentScan + "/" + this.centroidsFileName;
		let imageString = singleShot.convertImageToString();
		let centroidString = singleShot.convertCentroidsToString();
		fs.writeFile(imageSaveLocation, imageString, (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log("Saved image!");
			}
		});
		fs.writeFile(centroidSaveLocation, centroidString, (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log("Saved centroids!");
			}
		});
	},
};

const pageInfo = {
	currentTab: 0, // Keep track of which tab is active
};
