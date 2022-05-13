// Libraries
const fs = require("fs");
const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");
// Addon libraries
//const wavemeter = require("bindings")("wavemeter");
const melexir = require("bindings")("melexir");

let settings; // Global variable, to be filled in on startup

// Process and track info relating to electron count
const electrons = {
	// Average electron counts over time
	average: {
		method: {
			ccl: [],
			hybrid: [],
		},
		mode: {
			ir_on: [],
			ir_off: [],
		},
		stats: {
			calculation_time: [],
			led_intensities: [],
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
		mode: {
			ir_on: 0,
			ir_off: 0,
		},
		frame_count: {
			ir_on: 0,
			ir_off: 0,
		},
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
				radial_values: [],
				eBE_values: [],
				ir_off: [],
				ir_on: [],
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
		counters: {
			difference_counter: 0,
			difference_frequency: 20,
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
};

// Process and track info relating to lasers
const laser = {
	detachment: {
		mode: 0, // 0 is Standard, 1 is Doubled, 2 is Raman Shifter, 3 is IR-DFG
		wavelength: {
			yag_fundamental: 1064.0, // Nd:YAG fundamental wavelength
			input: 0, // User entered wavelength
			standard: 0,
			doubled: 0,
			raman: 0,
			irdfg: 0,
		},
		wavenumber: {
			yag_fundamental: 0, // Nd:YAG fundamental energy
			input: 0, // User entered energy
			standard: 0,
			doubled: 0,
			raman: 0,
			irdfg: 0,
		},
	},
	excitation: {
		mode: 0, // 0 is near IR, 1 is intermediate IR, 2 is mid IR, 3 is far IR
		wavelength: {
			yag_fundamental: 1064.5, // Nd:YAG fundamental wavelength
			nir: 0, // User entered wavelength
			iir: 0,
			mir: 0,
			fir: 0,
		},
		wavenumber: {
			yag_fundamental: 0, // Nd:YAG fundamental wavelength
			nir: 0, // User entered wavelength
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
};

page_info = {
	current_tab: 0,
};
