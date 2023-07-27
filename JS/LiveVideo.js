const ipc = require("electron").ipcRenderer;
const { Chart, registerables } = require("chart.js");
const { IPCMessages } = require("../JS/Messages.js");

Chart.register(...registerables);

////
let DOIT = false;
////

let settings;

// Startup
//window.onload = function () {
//	Startup();
//};

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send("live-view-window-ready", null);
};

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
	Startup();
});

function Startup() {
	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");

	LiveViewContext.fillstyle = "black";
	LiveViewContext.fillRect(0, 0, 768, 768);
}

function UpdateAverageDisplays() {
	const avgCountDisplay = document.getElementById("AvgECount");

	if (averageCount.updateCounter === averageCount.updateFrequency) {
		//avgCountDisplay.value = averageCount.getTotalAverage();
		avgCountDisplay.value = averageCount.getTotalIRAverage();

		averageCount.updateCounter = 0;
	} else {
		averageCount.updateCounter++;
	}
}

function UpdateScanDisplays() {
	const TotalCount = document.getElementById("TotalECount");

	TotalCount.value = scanInfo.getTotalCount();
}

// Receive message with centroid data
ipc.on(IPCMessages.UPDATE.NEWFRAME, function (event, centroid_results) {
	// centroid_results is an object containing:
	//		image_buffer			-	Uint8Buffer - Current image frame
	// 		com_centers				-	Array		- Center of Mass centroids
	//		hgcm_centers			-	Array		- HGCM method centroids
	//		computation_time		-	Float		- Time to calculate centroids (ms)
	//		is_led_on				- 	Boolean		- Whether IR LED was on in image
	//		avg_led_intensity		-	Float		- Average intensity of pixels in LED region
	//		avg_noise_intensity		-	Float		- Average intensity of pixels in noise region

	// Temp variables for image and AoI size
	let imageWidth = 1024;
	let imageHeight = 768;
	let xOffset = 100;
	let yOffset = 0;

	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");
	const LVData = LiveViewContext.getImageData(0, 0, imageWidth, imageHeight);

	// Put image on display
	LVData.data.set(centroid_results.image_buffer);
	LiveViewContext.putImageData(LVData, -xOffset, -yOffset);

	// Add counts to chart
	//eChartData.updateData(centroid_results);
	//eChartData.updateChart(eChart);
	newChart.update(centroid_results);

	// Update average counters
	averageCount.update(centroid_results);
	UpdateAverageDisplays();

	// Update scan display if a scan is running
	if (scanInfo.running) {
		scanInfo.update(centroid_results);
		UpdateScanDisplays();
	}

	if (DOIT) {
		doit();
	}
});

// Receive message about the scan
ipc.on("ScanUpdate", function (event, update) {
	// The update will either be
	// 		"start" - a scan was started
	// 		"pause" - scan was paused
	// 		"resume" - scan was resumed
	// 		"stop" - scan was stopped

	const TotalCountLabel = document.getElementById("TotalECountLabel");
	const TotalCount = document.getElementById("TotalECount");

	switch (update) {
		case "start":
			scanInfo.running = true;

			// Reset the counters
			scanInfo.reset();
			UpdateScanDisplays();

			// Make the total count display visible
			TotalCountLabel.style.visibility = "visible";
			TotalCount.style.visibility = "visible";
			break;

		case "pause":
			scanInfo.running = false;
			break;

		case "resume":
			scanInfo.running = true;
			break;

		case "stop":
			scanInfo.running = false;

			// Make the total count display hidden
			TotalCountLabel.style.visibility = "hidden";
			TotalCount.style.visibility = "hidden";
			break;
	}
});

// Receive message to update eChart axes
ipc.on("UpdateAxes", function (event, axisSizes) {
	eChartData.updateAxes(axisSizes);
	eChartData.updateChart(eChart);
});

const eChart = new Chart(document.getElementById("eChart").getContext("2d"), {
	type: "line",
	data: {
		datasets: [
			{
				//label: "Isolated Spots",
				borderColor: "red",
			},
			{
				//label: "Overlapping Spots",
				borderColor: "blue",
			},
		],
	},
	options: {
		scales: {
			y: {
				beginAtZero: true,
				//suggestedMax: 10, // Defines starting max value of chart
				title: {
					text: "Electron Count",
					color: "black",
					display: false,
				},
			},
			x: {
				title: {
					text: "Frame Number",
					color: "black",
					display: false,
				},
				//display: false,
			},
		},
		aspectRatio: 1.2,
		plugins: {
			legend: {
				display: false,
			},
		},
	},
});

const eChartData = {
	xAxisMax: 30,
	yAxisMax: 50,
	labels: [],
	comData: [],
	hgcmData: [],
	frameCount: 0,
	start: function () {
		this.running = true;
	},
	stop: function () {
		this.running = false;
	},
	reset: function () {
		this.labels = [];
		this.comData = [];
		this.hgcmData = [];
		this.frameCount = 0;
	},
	updateData: function (centroid_results) {
		this.labels.push(this.frameCount);
		this.comData.push(centroid_results.com_centers.length);
		this.hgcmData.push(centroid_results.com_centers.length + centroid_results.hgcm_centers.length);
		this.frameCount++;
		this.cleaveData();
	},
	cleaveData: function () {
		// Make sure chart has fewer data points than xAxisMax
		// By deleting the first point from each array
		while (this.labels.length > this.xAxisMax) {
			this.labels.shift();
		}
		while (this.comData.length > this.xAxisMax) {
			this.comData.shift();
		}
		while (this.hgcmData.length > this.xAxisMax) {
			this.hgcmData.shift();
		}
	},
	updateAxes: function (axisSizes) {
		if (axisSizes.length !== 2) {
			return;
		}
		this.xAxisMax = axisSizes[0];
		this.yAxisMax = axisSizes[1];
	},
	updateChart: function (echart) {
		// Update chart vertical max value
		//echart.options.scales.y.max = this.yAxisMax;
		// Update chart data
		echart.data.labels = this.labels;
		echart.data.datasets[0].data = this.comData;
		echart.data.datasets[1].data = this.hgcmData;
		echart.update("none");
	},
};

const averageCount = {
	prevCOMCounts: [],
	prevHGCMCounts: [],
	prevTotalCounts: [],
	prevTotalOnCounts: [], // Keeping track of IR on/off counts
	prevTotalOffCounts: [],
	updateCounter: 0, // Used to keep track of how many frames have
	// been processed since the last time avg display was updated
	updateFrequency: 10, // Number of frames before updating display
	update: function (centroid_results) {
		let com = centroid_results.com_centers.length;
		let hgcm = centroid_results.hgcm_centers.length;
		let total = com + hgcm;
		// Add to respective arrays
		this.prevCOMCounts.push(com);
		this.prevHGCMCounts.push(hgcm);
		this.prevTotalCounts.push(total);
		if (centroid_results.is_led_on) {
			this.prevTotalOnCounts.push(total);
		} else {
			this.prevTotalOffCounts.push(total);
		}
		// Make sure arrays are only 10 frames long
		// by removing earliest frame
		while (this.prevCOMCounts.length > 10) {
			this.prevCOMCounts.shift();
		}
		while (this.prevHGCMCounts.length > 10) {
			this.prevHGCMCounts.shift();
		}
		while (this.prevTotalCounts.length > 10) {
			this.prevTotalCounts.shift();
		}
		while (this.prevTotalOnCounts.length > 10) {
			this.prevTotalOnCounts.shift();
		}
		while (this.prevTotalOffCounts.length > 10) {
			this.prevTotalOffCounts.shift();
		}
	},
	getAverage: function (arr) {
		// Calculates the average value of the arrays
		if (arr.length === 0) {
			return 0;
		}
		const sum = arr.reduce((accumulator, currentValue) => {
			return accumulator + currentValue;
		});
		return sum / arr.length;
	},
	getCOMAverage: function () {
		return this.getAverage(this.prevCOMCounts).toFixed(2);
	},
	getHybridAverage: function () {
		return this.getAverage(this.prevHybridCounts).toFixed(2);
	},
	getTotalAverage: function () {
		return this.getAverage(this.prevTotalCounts).toFixed(2);
	},
	getTotalIRAverage: function () {
		return this.getAverage(this.prevTotalOffCounts).toFixed(2) + ", " + this.getAverage(this.prevTotalOnCounts).toFixed(2);
	},
};

const scanInfo = {
	running: false, // running does not change if scan is paused
	method: "normal", // Can be "normal" or "ir" // Need to add this in
	frameCount: 0,
	comCount: 0,
	hgcmCount: 0,
	totalCount: 0,
	startScan: function () {
		this.running = true;
	},
	stopScan: function () {
		this.running = false;
	},
	update: function (centroid_results) {
		let com = centroid_results.com_centers.length;
		let hgcm = centroid_results.hgcm_centers.length;
		let total = com + hgcm;
		// Add to counts
		this.comCount += com;
		this.hgcmCount += hgcm;
		this.totalCount += total;
		this.frameCount++;
	},
	reset: function () {
		this.frameCount = 0;
		this.comCount = 0;
		this.hgcmCount = 0;
		this.totalCount = 0;
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
};

function doit() {
	// Center at (526, 517) in (1024,1024)
	// => (394, 388)
	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");

	LiveViewContext.fillStyle = "red";
	LiveViewContext.fillRect(392, 386, 5, 5);
}

const newChart = {
	frames: [],
	electrons: [],
	temp_electron_count: 0,
	resets: 0,
	skip_counter: 0,
	frame_counter: 0,
	display_limit: 32,
	update: (centroid_results) => newChartUpdate(centroid_results),
	check: () => newChartCheck(),
	update_chart: () => newChartUpdateChart(),
	reset: () => newChartReset(),
};

function newChartUpdate(centroid_results) {
	let com = centroid_results.com_centers.length;
	let hgcm = centroid_results.hgcm_centers.length;
	let total = com + hgcm;
	newChart.temp_electron_count += total;
	if (newChart.skip_counter >= Math.pow(2, newChart.resets) - 1) {
		newChart.frames.push(newChart.frame_counter);
		let avg = newChart.temp_electron_count / (newChart.skip_counter + 1);
		newChart.electrons.push(avg);
		newChart.temp_electron_count = 0;
		newChart.skip_counter = 0;
		newChart.check();
		newChart.update_chart();
	} else {
		newChart.skip_counter++;
	}
	newChart.frame_counter++;
}

function newChartCheck() {
	if (newChart.frames.length < newChart.display_limit) return;

	// Shorten list so that every 2 data points become 1 data point
	let new_frames = [];
	let new_electrons = [];
	for (let i = 0; i < newChart.frames.length / 2; i++) {
		new_frames[i] = newChart.frames[2 * i];
		new_electrons[i] = (newChart.electrons[2 * i] + newChart.electrons[2 * i + 1]) / 2;
	}
	newChart.frames = new_frames;
	newChart.electrons = new_electrons;
	newChart.resets++;
}

function newChartUpdateChart() {
	eChart.data.labels = newChart.frames;
	eChart.data.datasets[0].data = newChart.electrons;
	//eChart.data.datasets[1].data = this.hgcmData;
	eChart.update("none");
}

function newChartReset() {
	newChart.frames = [];
	newChart.electrons = [];
	newChart.temp_electron_count = 0;
	newChart.resets = 0;
	newChart.skip_counter = 0;
	newChart.frame_counter = 0;
}
