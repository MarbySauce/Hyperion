const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");

// Startup
window.onload = function () {
	Startup();
};

function Startup() {
	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");

	LiveViewContext.fillstyle = "black";
	LiveViewContext.fillRect(0, 0, 768, 768);
}

function UpdateAverageDisplays() {
	const avgCountDisplay = document.getElementById("AvgECount");

	if (averageCount.updateCounter === averageCount.updateFrequency) {
		avgCountDisplay.value = averageCount.getTotalAverage();

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
ipc.on("new-camera-frame", function (event, centroidResults) {
	// Will return with object containing:
	// 		CCLCenters			-	Array
	//		hybridCenters		-	Array
	//		computationTime		-	Float
	//		isLEDon				- 	Boolean

	// Temp variables for image and AoI size
	let imageWidth = 1024;
	let imageHeight = 768;
	let xOffset = 0;
	let yOffset = 0;

	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");
	const LVData = LiveViewContext.getImageData(0, 0, imageWidth, imageHeight);

	// Put image on display
	LVData.data.set(centroidResults.imageBuffer);
	LiveViewContext.putImageData(LVData, -xOffset, -yOffset);

	// Add counts to chart
	eChartData.updateData(centroidResults);
	eChartData.updateChart(eChart);

	// Update average counters
	averageCount.update(centroidResults);
	UpdateAverageDisplays();

	// Update scan display if a scan is running
	if (scanInfo.running) {
		scanInfo.update(centroidResults);
		UpdateScanDisplays();
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
				suggestedMax: 10, // Defines starting max value of chart
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
				display: false,
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
	cclData: [],
	hybridData: [],
	frameCount: 0,
	start: function () {
		this.running = true;
	},
	stop: function () {
		this.running = false;
	},
	reset: function () {
		this.labels = [];
		this.cclData = [];
		this.hybridData = [];
		this.frameCount = 0;
	},
	updateData: function (centroidResults) {
		this.labels.push(this.frameCount);
		this.cclData.push(centroidResults.CCLCenters.length);
		this.hybridData.push(centroidResults.CCLCenters.length + centroidResults.hybridCenters.length);
		this.frameCount++;
		this.cleaveData();
	},
	cleaveData: function () {
		// Make sure chart has fewer data points than xAxisMax
		// By deleting the first point from each array
		while (this.labels.length > this.xAxisMax) {
			this.labels.shift();
		}
		while (this.cclData.length > this.xAxisMax) {
			this.cclData.shift();
		}
		while (this.hybridData.length > this.xAxisMax) {
			this.hybridData.shift();
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
		echart.options.scales.y.max = this.yAxisMax;
		// Update chart data
		echart.data.labels = this.labels;
		echart.data.datasets[0].data = this.cclData;
		echart.data.datasets[1].data = this.hybridData;
		echart.update("none");
	},
};

const averageCount = {
	prevCCLCounts: [],
	prevHybridCounts: [],
	prevTotalCounts: [],
	updateCounter: 0, // Used to keep track of how many frames have
	// been processed since the last time avg display was updated
	updateFrequency: 10, // Number of frames before updating display
	update: function (centroidResults) {
		let ccl = centroidResults.CCLCenters.length;
		let hybrid = centroidResults.hybridCenters.length;
		let total = ccl + hybrid;
		// Add to respective arrays
		this.prevCCLCounts.push(ccl);
		this.prevHybridCounts.push(hybrid);
		this.prevTotalCounts.push(total);
		// Make sure arrays are only 10 frames long
		// by removing earliest frame
		while (this.prevCCLCounts.length > 10) {
			this.prevCCLCounts.shift();
		}
		while (this.prevHybridCounts.length > 10) {
			this.prevHybridCounts.shift();
		}
		while (this.prevTotalCounts.length > 10) {
			this.prevTotalCounts.shift();
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
};

const scanInfo = {
	running: false, // running does not change if scan is paused
	method: "normal", // Can be "normal" or "ir" // Need to add this in
	frameCount: 0,
	cclCount: 0,
	hybridCount: 0,
	totalCount: 0,
	startScan: function () {
		this.running = true;
	},
	stopScan: function () {
		this.running = false;
	},
	update: function (centroidResults) {
		let ccl = centroidResults.CCLCenters.length;
		let hybrid = centroidResults.hybridCenters.length;
		let total = ccl + hybrid;
		// Add to counts
		this.cclCount += ccl;
		this.hybridCount += hybrid;
		this.totalCount += total;
		this.frameCount++;
	},
	reset: function () {
		this.frameCount = 0;
		this.cclCount = 0;
		this.hybridCount = 0;
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
