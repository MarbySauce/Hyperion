// Libraries
const fs = require("fs");
const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");
// Addon libraries
//const wavemeter = require("bindings")("wavemeter");
//const melexir = require("bindings")("melexir");

let settings; // Global variable, to be filled in on startup

// Class used to make inputs only execute a function if nothing has been typed for 1s
// Create new class instance using "let new_input_delay = new input_delay(fn_to_execute, args_to_pass);"
//	fn_to_execute is the name of the function to execute on input
//	args_to_pass is a list of arguments to give fn_to_execute
/**
 * Class used to make inputs only execute a function if nothing has been typed for 1s.
 * @param {function} fn_to_execute - Function to execute when input is received
 * @param {array} args_to_pass - List of arguments to give the function to execute upon input
 */
class input_delay {
	constructor(fn_to_execute, args_to_pass) {
		this.timeout = null;
		this.args_to_pass = args_to_pass || [];
		this.fn_to_execute = fn_to_execute;
	}
	/**
	 * Start 1s timer and execute if not interrupted by more inputs
	 */
	start_timer() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() => {
			this.execute();
		}, 1000 /* ms */);
	}
	execute() {
		this.fn_to_execute(...this.args_to_pass);
	}
}

/*****************************************************************************

							ELECTRON INFORMATION

*****************************************************************************/

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
		/**
		 * Adds element to array while keeping array at counters.update_frequency elements
		 * @param {array} arr - Array to append to
		 * @param {number} el - Element to append
		 */
		add: (arr, el) => electrons_average_add(arr, el),
		/**
		 * Get average value of array
		 * @param {array} arr - Array to average
		 * @returns {number} Average value
		 */
		get_average: (arr) => electrons_average_get_average(arr),
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
		/**
		 * Reset total counts (e.g. total electrons, total frames)
		 * @param {bool} was_running - Whether scan was being taken when function was called
		 */
		reset: (was_running) => electrons_total_reset(was_running),
	},
	/**
	 * Update electron counts with results from centroiding
	 * @param {object} centroid_results - Object containing electron centroids, computation time, and LED bool
	 */
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
		this.average.add(this.average.method.ccl, ccl_count);
		this.average.add(this.average.method.hybrid, hybrid_count);
		// Check if IR LED is on
		if (centroid_results.is_led_on) {
			this.average.add(this.average.mode.ir_on, total_count);
		} else {
			this.average.add(this.average.mode.ir_off, total_count);
		}
		this.average.add(this.average.stats.computation_time, comp_time);
		this.average.counters.update_counter++;
		this.charting.counters.frame_count++;
		// Update average values
		if (this.average.counters.update_counter >= this.average.counters.update_frequency) {
			this.average.method.ccl_value = this.average.get_average(this.average.method.ccl);
			this.average.method.hybrid_value = this.average.get_average(this.average.method.hybrid);
			this.average.mode.ir_on_value = this.average.get_average(this.average.mode.ir_on);
			this.average.mode.ir_off_value = this.average.get_average(this.average.mode.ir_off);
			// Reset update counter
			this.average.counters.update_counter = 0;
		} else {
			// Increment update counter
			this.average.counters.update_counter++;
		}
	},
};

/*	
		Specific funtions used for electrons	
*/

// Adds element el to array arr and keeps arr at a certain number of elements
function electrons_average_add(arr, el) {
	arr.push(el);
	while (arr.length > electrons.average.counters.update_frequency) {
		arr.shift();
	}
}

// Calculates the average value of the arrays
function electrons_average_get_average(arr) {
	const sum = arr.reduce((accumulator, current_value) => {
		return accumulator + current_value;
	});
	return sum / arr.length;
}

// Reset total values (if scan just started)
function electrons_total_reset(was_running) {
	if (!was_running) {
		electrons.total.e_count.ir_off = 0;
		electrons.total.e_count.ir_on = 0;
		electrons.total.frame_count.ir_off = 0;
		electrons.total.frame_count.ir_on = 0;
	}
}

/*****************************************************************************

							SCAN INFORMATION

*****************************************************************************/

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
		image_id: 1,
		autosave: false,
		autosave_delay: 100000, // in ms, time between autosaves
		/**
		 * Generate ir_off and ir_on file names to save
		 */
		get_file_names: () => scan_saving_get_file_names(),
		/**
		 * Start autosave timer if scan is running
		 * @param {boolean} was_running - Whether scan was running upon execution
		 */
		start_timer: (was_running) => scan_saving_start_timer(was_running),
		/**
		 * Autosave timer
		 */
		autosave_timer: () => scan_saving_autosave_timer(),
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
				use_ebe: false,
				radial_values: [],
				ebe_values: [],
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
			extrema: {
				r_min: 0,
				r_max: 0,
				ebe_min: 0,
				ebe_max: 0,
				/**
				 * Calculate maximum and minimum of PE spectrum x-axis (either radius or eBE)
				 */
				calculate: () => scan_accumulated_image_spectra_extrema_calculate(),
				/**
				 * Get minimum value for PE spectrum x-axis (either radius or eBE)
				 * @returns {number} Minimum value of array
				 */
				get_min: () => scan_accumulated_image_spectra_extrema_get_min(),
				/**
				 * Get maximum value for PE spectrum x-axis (either radius or eBE)
				 * @returns {number} Maximum value of array
				 */
				get_max: () => scan_accumulated_image_spectra_extrema_get_max(),
			},
			/**
			 * Save worked up spectra to file
			 */
			save: () => scan_accumulated_image_spectra_save(),
		},
		// Method for distinguishing IR off from IR on
		binning: {
			use_led: true, // If false, uses parity binning
			is_ir_on: false, // Only used if use_led is false
		},
		/**
		 * Update accumulated images with new electron centroids
		 * @param {object} centroid_results - Object containing electron centroids, computation time, and LED bool
		 */
		update: (centroid_results) => scan_accumulated_image_update(centroid_results),
		/**
		 * Save accumulated images to file
		 */
		save: () => scan_accumulated_image_save(),
		/**
		 * Reset accumulated images
		 * @param {boolean} was_running - Whether a scan was running when function was called
		 */
		reset: (was_running) => scan_accumulated_image_reset(was_running),
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

/*
		Specific functions for scan
*/

// Generate file names for ir_off and ir_on images
function scan_saving_get_file_names() {
	// Get the current date formatted as MMDDYY
	let today = new Date();
	let day = ("0" + today.getDate()).slice(-2);
	let month = ("0" + (today.getMonth() + 1)).slice(-2);
	let year = today.getFullYear().toString().slice(-2);
	let formatted_date = month + day + year;
	// Slice here makes sure 0 is not included if ionCounter > 9
	let increment = ("0" + scan.saving.image_id).slice(-2);
	scan.saving.file_name = `${formatted_date}i${increment}_1024.i0N`;
	scan.saving.file_name_ir = `${formatted_date}i${increment}_IR_1024.i0N`;
}

// Start autosave timer if a scan is running (can be paused)
function scan_saving_start_timer(was_running) {
	// Only start timer if scan just started
	if (!was_running) {
		// Start autosave timer
		scan.saving.autosave_timer();
	}
}

// Autosave timer loop
function scan_saving_autosave_timer() {
	// Set a loop with a delay of scan.saving.autosave_delay
	setTimeout(() => {
		// Make sure autosaving is still turned on
		if (!scan.saving.autosave) {
			return;
		}
		// Make sure a scan is currently running
		if (!scan.status.running) {
			return;
		}
		// Start the timer over again
		scan.saving.autosave_timer();
		// If the scan is paused, don't save (but still stay in autosave loop)
		if (scan.status.paused) {
			return;
		}
		// Save images to file
		scan.accumulated_image.save();
		// Save melexir results to file
		scan.accumulated_image.spectra.save();
	}, scan.saving.autosave_delay);
}

// Update accumulated images with new electrons
function scan_accumulated_image_update(centroid_results) {
	let image_to_update; // Will be either ir_off or ir_on
	let difference_image = scan.accumulated_image.images.difference;
	let difference_increment; // Will be +1 for ir_on and -1 for ir_off
	let X; // Filled with centroid values
	let Y;
	// If a scan is not running (or paused), don't update
	if (!scan.status.running || scan.status.paused) {
		return;
	}
	// Update to ir_off or ir_on based on IR LED
	if (centroid_results.is_led_on) {
		image_to_update = scan.accumulated_image.images.ir_on;
		difference_increment = 1;
	} else {
		image_to_update = scan.accumulated_image.images.ir_off;
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
			X = Math.round((X * scan.accumulated_image.params.accumulation_width) / scan.accumulated_image.params.aoi_width);
			Y = Math.round((Y * scan.accumulated_image.params.accumulation_height) / scan.accumulated_image.params.aoi_height);
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
			X = Math.round((X * scan.accumulated_image.params.accumulation_width) / scan.accumulated_image.params.aoi_width);
			Y = Math.round((Y * scan.accumulated_image.params.accumulation_height) / scan.accumulated_image.params.aoi_height);
			image_to_update[Y][X]++;
			difference_image[Y][X] += difference_increment;
		}
	}
}

// Save accumulated images to file
function scan_accumulated_image_save() {
	// Images are first saved to a temp location,
	// 	so that if the app crashes while writing to file, the old image still exists
	let file_name = settings.save_directory.full_dir + "/" + scan.saving.file_name;
	let file_name_ir = settings.save_directory.full_dir + "/" + scan.saving.file_name_ir;
	let temp_file_name = settings.save_directory.full_dir + "/temp.txt";
	let temp_file_name_ir = settings.save_directory.full_dir + "/temp_IR.txt";
	if (scan.status.method === "sevi") {
		// Need to save ir_off + ir_on image
		// Add images together and convert the final image to a string
		let image_str = "";
		let pix_value;
		for (let Y = 0; Y < scan.accumulated_image.params.accumulation_height; Y++) {
			for (let X = 0; X < scan.accumulated_image.params.accumulation_width; X++) {
				pix_value = scan.accumulated_image.images.ir_off[Y][X];
				pix_value += scan.accumulated_image.images.ir_on[Y][X];
				image_str += pix_value.toString() + " ";
			}
			image_str += "\n";
		}
		// Save the image to a temp file, then rename upon completion
		fs.writeFile(temp_file_name, image_str, (error) => {
			if (error) {
				console.log("Couldn't save image:", error);
			} else {
				// Rename file to correct file name
				fs.rename(temp_file_name, file_name, (error) => {
					if (error) {
						console.log("Couldn't rename temp file:", error);
					}
				});
			}
		});
	} else if (scan.status.method === "ir-sevi") {
		// Need to save ir_off and ir_on images separately
		// Convert images to strings
		let ir_off_image_str = scan.accumulated_image.images.ir_off.map((row) => row.join(" ")).join("\n");
		let ir_on_image_str = scan.accumulated_image.images.ir_on.map((row) => row.join(" ")).join("\n");
		// Save the ir_off image to a temp file, then rename upon completion
		fs.writeFile(temp_file_name, ir_off_image_str, (error) => {
			if (error) {
				console.log("Couldn't save image:", error);
			} else {
				// Rename file to correct file name
				fs.rename(temp_file_name, file_name, (error) => {
					if (error) {
						console.log("Couldn't rename temp file:", error);
					}
				});
			}
		});
		// Save the ir_on image to a temp file, then rename upon completion
		fs.writeFile(temp_file_name_ir, ir_on_image_str, (error) => {
			if (error) {
				console.log("Couldn't save image:", error);
			} else {
				// Rename file to correct file name
				fs.rename(temp_file_name_ir, file_name_ir, (error) => {
					if (error) {
						console.log("Couldn't rename temp file:", error);
					}
				});
			}
		});
	}
}

// Reset accumulated images if a new scan was started
function scan_accumulated_image_reset(was_running) {
	if (!was_running) {
		let image_height = scan.accumulated_image.params.accumulation_height;
		let image_width = scan.accumulated_image.params.accumulation_width;
		scan.accumulated_image.images.ir_off = Array.from(Array(image_height), () => new Array(image_width).fill(0));
		scan.accumulated_image.images.ir_on = Array.from(Array(image_height), () => new Array(image_width).fill(0));
		scan.accumulated_image.images.difference = Array.from(Array(image_height), () => new Array(image_width).fill(0));
	}
}

// Save worked up spectra to file
function scan_accumulated_image_spectra_save() {
	console.log("Still need to add options to save...");
}

// Calculate min/max values of spectra x-axes
function scan_accumulated_image_spectra_extrema_calculate() {
	if (scan.accumulated_image.spectra.data.radial_values.length > 0) {
		let r_min = Math.min(...scan.accumulated_image.spectra.data.radial_values);
		let r_max = Math.max(...scan.accumulated_image.spectra.data.radial_values);
		scan.accumulated_image.spectra.extrema.r_min = r_min;
		scan.accumulated_image.spectra.extrema.r_max = r_max;
	}
	if (scan.accumulated_image.spectra.data.ebe_values.length > 0) {
		let ebe_min = Math.min(...scan.accumulated_image.spectra.data.ebe_values);
		let ebe_max = Math.max(...scan.accumulated_image.spectra.data.ebe_values);
		scan.accumulated_image.spectra.extrema.ebe_min = ebe_min;
		scan.accumulated_image.spectra.extrema.ebe_max = ebe_max;
	}
}

// Return minimum of spectra x-axis (return ebe_min, else return r_min)
function scan_accumulated_image_spectra_extrema_get_min() {
	if (scan.accumulated_image.spectra.data.use_ebe) {
		return scan.accumulated_image.spectra.extrema.ebe_min;
	} else {
		return scan.accumulated_image.spectra.extrema.r_min;
	}
}

// Return maximum of spectra x-axis (return ebe_max, else return r_max)
function scan_accumulated_image_spectra_extrema_get_max() {
	if (scan.accumulated_image.spectra.data.use_ebe) {
		return scan.accumulated_image.spectra.extrema.ebe_max;
	} else {
		return scan.accumulated_image.spectra.extrema.r_max;
	}
}

/*****************************************************************************

							LASER INFORMATION

*****************************************************************************/

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
		/**
		 * Convert detachment laser energies
		 */
		convert: () => laser_detachment_convert(),
	},
	excitation: {
		mode: "nir", // Can be "nir", "iir", "mir", or "fir"
		wavelength: {
			yag_fundamental: 1064.5, // Nd:YAG fundamental wavelength
			input: 0, // User entered (or measured) wavelength
			nir: 0,
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
		/**
		 * Convert OPO/A laser energies
		 */
		convert: () => laser_excitation_convert(),
	},
	/**
	 * Convert between wavelength (nm) and wavenumbers (cm^-1)
	 * @param {number} energy - Energy to convert
	 * @returns Converted energy
	 */
	convert_wn_wl: function (energy) {
		if (!energy) {
			// Energy is 0 or undefined
			return 0;
		}
		return Math.pow(10, 7) / energy;
	},
};

/*
	Specific functions used for laser
*/

// Convert detachment laser energies
function laser_detachment_convert() {
	const h2_wn = 4055.201; // H2 frequency in cm^-1, for Raman shifter
	let input_wl = laser.detachment.wavelength.input; // Input energy (nm)
	let input_wn = decimal_round(laser.convert_wn_wl(input_wl), 3); // Input energy (cm^-1)
	let yag_wl = laser.detachment.wavelength.yag_fundamental; // YAG fundamental (nm)
	let yag_wn = decimal_round(laser.convert_wn_wl(yag_wl), 3); // YAG fundamental (cm^-1)
	// Make sure YAG fundamental in cm^-1 is defined
	laser.detachment.wavenumber.yag_fundamental = yag_wn;
	// Standard setup, will be the same as input value
	laser.detachment.wavelength.standard = input_wl;
	laser.detachment.wavenumber.standard = input_wn;
	// Doubled setup, energies are doubled
	let doubled_wn = 2 * input_wn; // Doubled (cm^-1)
	let doubled_wl = laser.convert_wn_wl(doubled_wn); // Doubled (nm)
	laser.detachment.wavelength.doubled = decimal_round(doubled_wl, 3);
	laser.detachment.wavenumber.doubled = decimal_round(doubled_wn, 3);
	// Raman shifter setup, subtract off H2 Raman frequency
	let raman_wn = input_wn - h2_wn; // Raman shifter (cm^-1)
	let raman_wl = laser.convert_wn_wl(raman_wn); // Raman shifter (nm)
	laser.detachment.wavelength.raman = decimal_round(raman_wl, 3);
	laser.detachment.wavenumber.raman = decimal_round(raman_wn, 3);
	// IR-DFG setup, subtract off YAG fundamental frequency
	let irdfg_wn = input_wn - yag_wn; // IR-DFG (cm^-1)
	let irdfg_wl = laser.convert_wn_wl(irdfg_wn); // IR-DFG (nm)
	laser.detachment.wavelength.irdfg = decimal_round(irdfg_wl, 3);
	laser.detachment.wavenumber.irdfg = decimal_round(irdfg_wn, 3);
}

// Convert OPO/A laser energies
function laser_excitation_convert() {
	let input_wl = laser.excitation.wavelength.input; // Input energy (nm)
	let input_wn = decimal_round(laser.convert_wn_wl(input_wl), 3); // Input energy (cm^-1)
	let yag_wl = laser.excitation.wavelength.yag_fundamental; // YAG fundamental (nm)
	let yag_wn = decimal_round(laser.convert_wn_wl(yag_wl), 3); // YAG fundamental (cm^-1)
	// Make sure YAG fundamental in cm^-1 is defined
	laser.excitation.wavenumber.yag_fundamental = yag_wn;
	// Near-IR, will be the same as input value
	laser.excitation.wavelength.nir = input_wl;
	laser.excitation.wavenumber.nir = input_wn;
	// Intermediate-IR, 2 * YAG - nIR (cm^-1)
	let iir_wn = 2 * yag_wn - input_wn; // iIR (cm^-1)
	let iir_wl = laser.convert_wn_wl(iir_wn); // iIR (nm)
	laser.excitation.wavelength.iir = decimal_round(iir_wl, 3);
	laser.excitation.wavenumber.iir = decimal_round(iir_wn, 3);
	// Mid-IR, YAG - iIR (cm^-1)
	let mir_wn = yag_wn - iir_wn; // mIR (cm^-1)
	let mir_wl = laser.convert_wn_wl(mir_wn); // mIR (nm)
	laser.excitation.wavelength.mir = decimal_round(mir_wl, 3);
	laser.excitation.wavenumber.mir = decimal_round(mir_wn, 3);
	// Far-IR, iIR - mIR (cm^-1)
	let fir_wn = iir_wn - mir_wn; // fIR (cm^-1)
	let fir_wl = laser.convert_wn_wl(fir_wn); // fIR (nm)
	laser.excitation.wavelength.fir = decimal_round(fir_wl, 3);
	laser.excitation.wavenumber.fir = decimal_round(fir_wn, 3);
}

/*****************************************************************************

							VMI INFORMATION

*****************************************************************************/

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

/*****************************************************************************

							PAGE INFORMATION

*****************************************************************************/

const page_info = {
	current_tab: 0,
};

/*****************************************************************************

							PE SPECTRUM CONFIGURATION

*****************************************************************************/

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
