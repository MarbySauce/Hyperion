// Libraries
const fs = require("fs");
const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");
// Addon libraries
//const wavemeter = require("bindings")("wavemeter");
//const melexir = require("bindings")("melexir");

let settings; // Global variable, to be filled in on startup

// Process and track info relating to electron count
const electrons = {
	// Average electron counts over time
	average: {
		method: {
			ccl: [],
			hybrid: [],
			ccl_value: 0, // Store the average values
			hybrid_value: 0,
		},
		mode: {
			ir_on: [],
			ir_off: [],
			ir_on_value: 0, // Store the average values
			ir_off_value: 0,
		},
		stats: {
			computation_time: [],
			computation_time_value: 0, // Store the average values
		},
		counters: {
			update_counter: 0,
			update_frequency: 10,
		},
	},
	// Used for plotting electron counts on a graph
	charting: {
		data: {
			frame_labels: [],
			method: {
				ccl: [],
				hybrid: [],
			},
			mode: {
				ir_off: [],
				ir_on: [],
			},
		},
		counters: {
			chart_length: 10,
			frame_count: 0,
		},
	},
	// Total counts of current scan
	total: {
		method: {
			ccl: 0,
			hybrid: 0,
		},
		e_count: {
			ir_on: 0,
			ir_off: 0,
		},
		frame_count: {
			ir_on: 0,
			ir_off: 0,
		},
	},
	// Update values with results from invisible window
	update: function (centroid_results) {
		let ccl_count = centroid_results.ccl_centers.length;
		let hybrid_count = centroid_results.hybrid_centers.length;
		let total_count = ccl_count + hybrid_count;
		let comp_time = centroid_results.computation_time;

		// If a scan is currently being taken, update total values
		if (scan.status.running && !scan.status.paused) {
			this.total.method.ccl += ccl_count;
			this.total.method.hybrid += hybrid_count;
			// Check if the IR LED is on
			if (centroid_results.is_led_on) {
				this.total.e_count.ir_on += total_count;
				this.total.frame_count.ir_on++;
			} else {
				this.total.e_count.ir_off += total_count;
				this.total.frame_count.ir_off++;
			}
		}

		// Add values to average arrays
		this.add(this.average.method.ccl, ccl_count);
		this.add(this.average.method.hybrid, hybrid_count);
		// Check if IR LED is on
		if (centroid_results.is_led_on) {
			this.add(this.average.mode.ir_on, total_count);
		} else {
			this.add(this.average.mode.ir_off, total_count);
		}
		this.add(this.average.stats.computation_time, comp_time);
		this.average.counters.update_counter++;
		this.charting.counters.frame_count++;
		// Update average values
		if (this.average.counters.update_counter >= this.average.counters.update_frequency) {
			this.average.method.ccl_value = this.get_average(this.average.method.ccl);
			this.average.method.hybrid_value = this.get_average(this.average.method.hybrid);
			this.average.mode.ir_on_value = this.get_average(this.average.mode.ir_on);
			this.average.mode.ir_off_value = this.get_average(this.average.mode.ir_off);
			// Reset update counter
			this.average.counters.update_counter = 0;
		} else {
			// Increment update counter
			this.average.counters.update_counter++;
		}
	},
	// Adds element el to array arr and keeps arr at a certain number of elements
	add: function (arr, el) {
		arr.push(el);
		while (arr.length > this.average.counters.update_frequency) {
			arr.shift();
		}
	},
	// Calculates the average value of the arrays
	get_average: function (arr) {
		const sum = arr.reduce((accumulator, current_value) => {
			return accumulator + current_value;
		});
		return sum / arr.length;
	},
	// Reset total values (if scan just started)
	reset: function (was_running) {
		if (!was_running) {
			this.total.e_count.ir_off = 0;
			this.total.e_count.ir_on = 0;
			this.total.frame_count.ir_off = 0;
			this.total.frame_count.ir_on = 0;
		}
	},
};

// Track info relating to scan parameters
const scan = {
	status: {
		running: false,
		paused: false,
		method: "sevi",
	},
	saving: {
		file_name: "",
		file_name_ir: "",
		autosave: false,
		autosave_timer: 100000, // in ms, time between autosaves
	},
	accumulated_image: {
		params: {
			camera_width: 1024,
			camera_height: 768,
			aoi_width: 768,
			aoi_height: 768,
			accumulation_width: 1024,
			accumulation_height: 1024,
		},
		images: {
			ir_off: [],
			ir_on: [],
			difference: [],
		},
		spectra: {
			data: {
				image_id: 1,
				radial_values: [],
				eBE_values: [],
				ir_off_intensity: [],
				ir_off_anisotropy: [],
				ir_on_intensity: [],
				ir_on_anisotropy: [],
				difference: [],
			},
			params: {
				x_range_lower: 0,
				x_range_upper: 0,
				y_range_lower: 0,
				y_range_upper: 0,
				// Add more here for depletion parameters
			},
		},
		// Method for distinguishing IR off from IR on
		binning: {
			use_led: true, // If false, uses parity binning
			is_ir_on: false, // Only used if use_led is false
		},
	},
	single_shot: {
		saving: {
			to_save: false,
			file_name: "",
		},
		data: {
			image_buffer: [],
			image_centroids: [],
		},
	},
	previous: {
		all: [], // Array of all scans taken in a day
		last: undefined, // Most recent scan taken
	},
	// Update images with new electrons
	update_images: function (centroid_results) {
		let image_to_update; // Will be either ir_off or ir_on
		let difference_image = this.accumulated_image.images.difference;
		let difference_increment; // Will be +1 for ir_on and -1 for ir_off
		let X; // Filled with centroid values
		let Y;
		// If a scan is not running (or paused), don't update
		if (!scan.status.running || scan.status.paused) {
			return;
		}
		// Update to ir_off or ir_on based on IR LED
		if (centroid_results.is_led_on) {
			image_to_update = this.accumulated_image.images.ir_on;
			difference_increment = 1;
		} else {
			image_to_update = this.accumulated_image.images.ir_off;
			difference_increment = -1;
		}
		// Update image with electrons
		// CCL centroids first
		for (let i = 0; i < centroid_results.ccl_centers.length; i++) {
			// make sure centroid is not blank (i.e. [0, 0])
			if (centroid_results.ccl_centers[i][0] !== 0) {
				X = centroid_results.ccl_centers[i][0];
				Y = centroid_results.ccl_centers[i][1];
				// Need to account for accumulated image size and round to ints
				X = Math.round((X * this.accumulated_image.params.accumulation_width) / this.accumulated_image.params.aoi_width);
				Y = Math.round((Y * this.accumulated_image.params.accumulation_height) / this.accumulated_image.params.aoi_height);
				image_to_update[Y][X]++;
				difference_image[Y][X] += difference_increment;
			}
		}
		// Hybrid centroids now
		for (let i = 0; i < centroid_results.hybrid_centers.length; i++) {
			// make sure centroid is not blank (i.e. [0, 0])
			if (centroid_results.hybrid_centers[i][0] !== 0) {
				X = centroid_results.hybrid_centers[i][0];
				Y = centroid_results.hybrid_centers[i][1];
				// Need to account for accumulated image size and round to ints
				X = Math.round((X * this.accumulated_image.params.accumulation_width) / this.accumulated_image.params.aoi_width);
				Y = Math.round((Y * this.accumulated_image.params.accumulation_height) / this.accumulated_image.params.aoi_height);
				image_to_update[Y][X]++;
				difference_image[Y][X] += difference_increment;
			}
		}
	},
	// Reset images if a new scan was started
	reset_images: function (was_running) {
		if (!was_running) {
			let image_height = this.accumulated_image.params.accumulation_height;
			let image_width = this.accumulated_image.params.accumulation_width;
			this.accumulated_image.images.ir_off = Array.from(Array(image_height), () => new Array(image_width).fill(0));
			this.accumulated_image.images.ir_on = Array.from(Array(image_height), () => new Array(image_width).fill(0));
			this.accumulated_image.images.difference = Array.from(Array(image_height), () => new Array(image_width).fill(0));
		}
	},
};

// Process and track info relating to lasers
const laser = {
	detachment: {
		mode: "standard", // Can be "standard", "doubled", "raman", or "irdfg"
		wavelength: {
			yag_fundamental: 1064.0, // Nd:YAG fundamental wavelength
			input: 0, // User entered (or measured) wavelength
			standard: 0,
			doubled: 0,
			raman: 0,
			irdfg: 0,
		},
		wavenumber: {
			yag_fundamental: 0, // Nd:YAG fundamental energy
			standard: 0,
			doubled: 0,
			raman: 0,
			irdfg: 0,
		},
	},
	excitation: {
		mode: "nir", // Can be "nir", "iir", "mir", or "fir"
		wavelength: {
			yag_fundamental: 1064.5, // Nd:YAG fundamental wavelength
			nir: 0, // User entered (or measured) wavelength
			iir: 0,
			mir: 0,
			fir: 0,
		},
		wavenumber: {
			yag_fundamental: 0, // Nd:YAG fundamental wavelength
			nir: 0,
			iir: 0,
			mir: 0,
			fir: 0,
		},
		control: {
			nir_lower_bound: 710,
			nir_upper_bound: 880,
			current_nir_motor: 0,
			desired_ir: 0,
		},
	},
	// Convert between wavelength (nm) and wavenumbers (cm^-1)
	convert_wn_wl: function (energy) {
		if (!energy) {
			// Energy is 0 or undefined
			return 0;
		}
		return Math.pow(10, 7) / energy;
	},
};

const vmi_info = {
	selected_setting: "V1", // "V1", "V2", "V3", or "V4"
	// Calibration constants to convert from R(px) to eBE(cm^-1)
	// 		eBE = hv(cm^-1) - (a * R^2 + b * R^4)
	calibration_constants: {
		V1: {
			a: 1.591962e-2,
			b: 3.016263e-9,
		},
		V2: {
			a: 3.15732e-2,
			b: 7.116001e-9,
		},
		V3: {
			a: 6.238694e-2,
			b: 1.309954e-8,
		},
		V4: {
			a: 0,
			b: 0,
		},
	},
};

const page_info = {
	current_tab: 0,
};

let spectrum_display; // Will be filled in with chart for PE Spectrum

// Configuration for PE Spectra
const spectrum_config = {
	type: "scatter",
	data: {
		labels: [],
		datasets: [
			{
				data: [],
				label: "IR On",
				borderColor: "red",
				showLine: true,
			},
			{
				data: [],
				label: "IR Off",
				borderColor: "black",
				showLine: true,
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
				ticks: {
					stepSize: 100,
				},
			},
		},
		elements: {
			point: {
				radius: 0,
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
	},
};

let melexir_worker; // Filled in with Web Worker for Melexir
