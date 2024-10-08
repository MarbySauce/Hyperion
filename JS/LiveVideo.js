const ipc = require("electron").ipcRenderer;
const { Chart, registerables } = require("chart.js");
const { IPCMessages } = require("../JS/Libraries/Messages.js");

if (registerables) Chart.register(...registerables);

let settings;

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send(IPCMessages.READY.LIVEVIEW);
};

// Recieve setting information and go through startup procedure
ipc.once(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
	settings = settings_information;
	Startup();
	ipc.on(IPCMessages.INFORMATION.SETTINGS, (event, settings_information) => {
		settings = settings_information;
	});
});

function Startup() {
	const LiveViewContext = document.getElementById("LiveVideoView").getContext("2d");

	LiveViewContext.fillstyle = "black";
	LiveViewContext.fillRect(0, 0, 768, 768);
}

let enlarged = false;
document.getElementById("EnlargeButton").onclick = () => {
	const div = document.getElementById("CountInformation");
	const button = document.getElementById("EnlargeButton");
	if (enlarged) {
		div.classList.remove("large");
		button.innerText = "Enlarge";
		enlarged = false;
	} else {
		div.classList.add("large");
		button.innerText = "Reduce";
		enlarged = true;
	}
};

function UpdateAverageDisplays() {
	const IROff = document.getElementById("IROffCount");
	const IROn = document.getElementById("IROnCount");
	const Total = document.getElementById("TotalCount");

	if (averageCount.updateCounter === averageCount.updateFrequency) {
		let [off_count, on_count] = averageCount.getTotalIRAverage();
		let total_count = (off_count + on_count) / 2;

		IROff.value = off_count.toFixed(1);
		IROn.value = on_count.toFixed(1);
		Total.value = total_count.toFixed(1);

		averageCount.updateCounter = 0;
	} else {
		averageCount.updateCounter++;
	}
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
	let LVData = new ImageData(imageWidth, imageHeight);

	// Put image on display
	LVData.data.set(centroid_results.image_buffer);
	LiveViewContext.putImageData(LVData, -xOffset, -yOffset);

	// Add counts to chart
	eChartData.updateData(centroid_results);
	//eChartData.updateDataMini(centroid_results);
	eChartData.updateChart(eChart);

	// Update average counters
	averageCount.update(centroid_results);
	UpdateAverageDisplays();
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
	xAxisMax: 60,
	yAxisMax: 50,
	labels: [],
	comData: [],
	hgcmData: [],
	frameCount: 0,

	comDataMini: [],
	hgcmDataMini: [],

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

	updateDataMini: function (centroid_results) {
		this.comDataMini.push(centroid_results.com_centers.length);
		this.hgcmDataMini.push(centroid_results.hgcm_centers.length + centroid_results.com_centers.length);

		if (this.comDataMini.length > 20) {
			const com_sum = this.comDataMini.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
			let com_avg = com_sum / this.comDataMini.length;
			const hgcm_sum = this.hgcmDataMini.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
			let hgcm_avg = hgcm_sum / this.hgcmDataMini.length;

			this.labels.push(this.frameCount);
			this.comData.push(com_avg);
			this.hgcmData.push(hgcm_avg);

			this.comDataMini = [];
			this.hgcmDataMini = [];
			this.cleaveData();
		}

		this.frameCount++;
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
	AvgCountLength: 10,
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
		while (this.prevCOMCounts.length > this.AvgCountLength) {
			this.prevCOMCounts.shift();
		}
		while (this.prevHGCMCounts.length > this.AvgCountLength) {
			this.prevHGCMCounts.shift();
		}
		while (this.prevTotalCounts.length > this.AvgCountLength) {
			this.prevTotalCounts.shift();
		}
		while (this.prevTotalOnCounts.length > this.AvgCountLength) {
			this.prevTotalOnCounts.shift();
		}
		while (this.prevTotalOffCounts.length > this.AvgCountLength) {
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
		//return this.getAverage(this.prevTotalOffCounts).toFixed(2) + ", " + this.getAverage(this.prevTotalOnCounts).toFixed(2);
		return [this.getAverage(this.prevTotalOffCounts), this.getAverage(this.prevTotalOnCounts)];
	},
};
