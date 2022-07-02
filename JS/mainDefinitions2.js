// Libraries
const fs = require("fs");
const ipc = require("electron").ipcRenderer;
const Chart = require("chart.js");
// OPO/A is controlled through TCP communication, which is done through JS module Net
const net = require("net");
// Addon libraries
const wavemeter = require("bindings")("wavemeter");

let settings; // Global variable, to be filled in on startup

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
			/**
			 * Get the total electron count as a formatted string
			 * @param {string} image - can be "total", "ir_off", or "ir_on"
			 * @returns {string} total ir_on electron count
			 */
			get_count: (image) => electrons_total_e_count_get_count(image),
		},
		frame_count: {
			ir_on: 0,
			ir_off: 0,
		},
		auto_stop: {
			method: "none", // Can be "none", "electrons", or "frames"
			electrons: 0,
			frames: 0,
			update: (value) => electrons_auto_stop_update(value),
			check: () => electrons_auto_stop_check(),
		},
		/**
		 * Reset total counts (e.g. total electrons, total frames)
		 */
		reset: () => electrons_total_reset(),
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

// Reset total values
function electrons_total_reset() {
	electrons.total.e_count.ir_off = 0;
	electrons.total.e_count.ir_on = 0;
	electrons.total.frame_count.ir_off = 0;
	electrons.total.frame_count.ir_on = 0;
}

// Get formatted string (X.XXXeN) of electron count
//	image can be "total", "ir_off", or "ir_on"
function electrons_total_e_count_get_count(image) {
	let total_count;
	if (image === "total") {
		total_count = electrons.total.e_count.ir_off + electrons.total.e_count.ir_on;
	} else if (image === "ir_off") {
		total_count = electrons.total.e_count.ir_off;
	} else if (image === "ir_on") {
		total_count = electrons.total.e_count.ir_on;
	} else {
		return "";
	}
	if (total_count < 10000) {
		// Just return the number
		return total_count.toString();
	}
	// Return formatted string
	return total_count.toExponential(3);
}

// Update the auto-stop values
function electrons_auto_stop_update(value) {
	if (electrons.total.auto_stop.method === "electrons") {
		electrons.total.auto_stop.electrons = value;
	} else if (electrons.total.auto_stop.method === "frames") {
		electrons.total.auto_stop.frames = value;
	}
}

// Check if auto stop criteria have been met
function electrons_auto_stop_check() {
	// Make sure a scan is running and not paused
	if (!scan.status.running || scan.status.paused) {
		return;
	}
	let ir_off_count;
	let ir_on_count;
	let requirement;
	let to_save = false;

	if (electrons.total.auto_stop.method === "none") {
		return;
	} else if (electrons.total.auto_stop.method === "electrons") {
		// Make sure there is a value to stop at
		if (electrons.total.auto_stop.electrons > 0) {
			ir_off_count = electrons.total.e_count.ir_off;
			ir_on_count = electrons.total.e_count.ir_on;
			requirement = electrons.total.auto_stop.electrons * Math.pow(10, 5);
		} else {
			return;
		}
	} else if (electrons.total.auto_stop.method === "frames") {
		if (electrons.total.auto_stop.frames > 0) {
			ir_off_count = electrons.total.frame_count.ir_off;
			ir_on_count = electrons.total.frame_count.ir_on;
			requirement = electrons.total.auto_stop.frames * 1000;
		} else {
			return;
		}
	}

	// Check if it's normal sevi or ir sevi
	if (scan.status.method === "sevi") {
		// Check if total count surpasses requirement
		if (ir_off_count + ir_on_count >= requirement) {
			to_save = true;
		}
	} else if (scan.status.method === "ir-sevi") {
		// Check if both ir_off and ir_on surpass requirement
		if (ir_off_count >= requirement && ir_on_count >= requirement) {
			to_save = true;
		}
	}

	if (to_save) {
		// Save image (essentially pressing save button)
		sevi_start_save_button();
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
		method: "sevi", // Can be "sevi" or "ir-sevi"
	},
	saving: {
		file_name: "",
		file_name_ir: "",
		pes_file_name: "",
		pes_file_name_ir: "",
		image_id: 1,
		autosave: false,
		autosave_delay: 100000, // in ms, time between autosaves
		/**
		 * Generate ir_off and ir_on file names to save
		 */
		get_file_names: () => scan_saving_get_file_names(),
		/**
		 * Start autosave timer if scan is running
		 */
		start_timer: () => scan_saving_start_timer(),
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
				radial_values: [],
				ebe_values: [],
				ir_off_intensity: [],
				ir_off_anisotropy: [],
				ir_on_intensity: [],
				ir_on_anisotropy: [],
				difference: [],
				zeroes: [],
				normalized: {
					ir_off_intensity: [],
					ir_on_intensity: [],
					normalization_factor: 1,
				},
			},
			params: {
				image_id: 1,
				use_ebe: false, // Whether to use eBE or radial values
				show_difference: false, // Whether to show IR on/off or difference spectra
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
			/**
			 * Get the IR Off spectrum, normalized if applicable
			 * @returns {array} IR Off spectrum
			 */
			get_ir_off: () => scan_accumulated_image_spectra_get_ir_off(),
			/**
			 * Get the IR On spectrum, normalized if applicable
			 * @returns {array} IR On spectrum
			 */
			get_ir_on: () => scan_accumulated_image_spectra_get_ir_on(),
			/**
			 * Get the eBE array if possible, or radial array otherwise
			 * @returns {array} eBE or radial array
			 */
			get_x_axis: () => scan_accumulated_image_spectra_get_x_axis(),
			/**
			 * Calculate difference spectrum
			 * @returns {array} Difference spectrum
			 */
			calculate_difference: () => scan_accumulated_image_spectra_calculate_difference(),
			/**
			 * Reset spectra arrays and boolean values
			 */
			reset: () => scan_accumulated_image_spectra_reset(),
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
		 */
		reset: () => scan_accumulated_image_reset(),
	},
	action_mode: {
		params: {
			energy: {
				start: 0, // cm-1
				end: 0, // cm-1
				increment: 0, // cm-1
				update: (start, end, increment) => scan_action_mode_params_energy_update(start, end, increment),
			},
			peak_radii: {
				mode: "depletion", // or "rel_height"
				origin: 0, // px
				new_peak: 0, // px
				update: (mode, origin, new_peak) => scan_action_mode_params_peak_radii_update(mode, origin, new_peak),
			},
		},
		status: {
			running: false,
			paused: false,
			data_points: {
				total: 0,
				current: 0,
				calculate: () => scan_action_mode_status_data_points_calculate(),
			},
			first_image: 0,
			last_image: 0,
		},
		data: {
			energies: [],
			absorption: [],
			peak_areas: {
				origin_off: [],
				origin_on: [],
				new_peak: [],
				calculate: () => scan_action_mode_data_peak_areas_calculate(),
			},
			update: (data) => scan_action_mode_data_update(data),
			reset: () => scan_action_mode_data_reset(),
		},
		calculate_absorption: (origin_off_area, origin_on_area, new_peak_area) =>
			scan_action_mode_calculate_absorption(origin_off_area, origin_on_area, new_peak_area),
		save: () => scan_action_mode_save(),
	},
	single_shot: {
		saving: {
			to_save: false,
			file_name: "singleShot.txt",
			centroids_file_name: "ssCentroids.txt",
		},
		data: {
			image_buffer: [],
			image_centroids: [],
		},
		/**
		 * Check if single shot should be saved
		 * @param {object} centroid_results - Object containing electron centroids, computation time, and LED bool
		 */
		check: (centroid_results) => scan_single_shot_check(centroid_results),
		/**
		 * Save single shot data to file
		 */
		save: () => scan_single_shot_save(),
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
	let id = ("0" + scan.saving.image_id).slice(-2);
	let pes_id = ("0" + scan.accumulated_image.spectra.params.image_id).slice(-2);
	scan.saving.file_name = `${formatted_date}i${id}_1024.i0N`;
	scan.saving.file_name_ir = `${formatted_date}i${id}_IR_1024.i0N`;
	scan.saving.pes_file_name = `${formatted_date}i${pes_id}_1024_pes.dat`;
	scan.saving.pes_file_name_ir = `${formatted_date}i${pes_id}_IR_1024_pes.dat`;
}

// Start autosave timer
function scan_saving_start_timer() {
	scan.saving.autosave_timer();
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

// Reset accumulated images
function scan_accumulated_image_reset() {
	let image_height = scan.accumulated_image.params.accumulation_height;
	let image_width = scan.accumulated_image.params.accumulation_width;
	scan.accumulated_image.images.ir_off = Array.from(Array(image_height), () => new Array(image_width).fill(0));
	scan.accumulated_image.images.ir_on = Array.from(Array(image_height), () => new Array(image_width).fill(0));
	scan.accumulated_image.images.difference = Array.from(Array(image_height), () => new Array(image_width).fill(0));
}

// Save worked up spectra to file
function scan_accumulated_image_spectra_save() {
	let file_name = settings.save_directory.full_dir + "/" + scan.saving.pes_file_name;
	let file_name_ir = settings.save_directory.full_dir + "/" + scan.saving.pes_file_name_ir;
	let save_ir_off = false;
	let save_ir_on = false;
	let ir_off_string = "";
	let ir_on_string = "";
	// Used to shorten code
	const spectrum_data = scan.accumulated_image.spectra.data;
	if (spectrum_data.ir_off_intensity.length > 0) {
		// ir_off image was worked up, save to file
		save_ir_off = true;
	}
	if (spectrum_data.ir_on_intensity.length > 0) {
		// ir_on image was worked up, save to file
		save_ir_on = true;
	}
	if (!save_ir_off && !save_ir_on) {
		// Neither image has been worked up, return
		return;
	}
	// Convert spectra into write-able string with 3 columns: radius, intensity, anisotropy
	for (let i = 0; i < spectrum_data.radial_values.length; i++) {
		if (save_ir_off) {
			ir_off_string += spectrum_data.radial_values[i].toExponential(6) + " ";
			ir_off_string += spectrum_data.ir_off_intensity[i].toExponential(6) + " ";
			ir_off_string += spectrum_data.ir_off_anisotropy[i].toExponential(6) + " \n";
		}
		if (save_ir_on) {
			ir_on_string += spectrum_data.radial_values[i].toExponential(6) + " ";
			ir_on_string += spectrum_data.ir_on_intensity[i].toExponential(6) + " ";
			ir_on_string += spectrum_data.ir_on_anisotropy[i].toExponential(6) + " \n";
		}
	}
	// Save to file
	if (save_ir_off) {
		fs.writeFile(file_name, ir_off_string, (error) => {
			if (error) {
				console.log("Could not save spectrum:", error);
			}
		});
	}
	if (save_ir_on) {
		fs.writeFile(file_name_ir, ir_on_string, (error) => {
			if (error) {
				console.log("Could not save spectrum:", error);
			}
		});
	}
}

// Return the ir_off spectrum (after normalization if applicable)
function scan_accumulated_image_spectra_get_ir_off() {
	// If showing radial plot, just return ir_off array
	if (!scan.accumulated_image.spectra.params.use_ebe) {
		return scan.accumulated_image.spectra.data.ir_off_intensity;
	}
	const spectra_data = scan.accumulated_image.spectra.data;
	// Showing eBE plot
	// In order to conserve areas of peaks (i.e. Intensity(R)dR == Intensity(eKE)deKE)
	// 	need to divide intensity by deKE/dR = 2 a R + 4 b R^3
	let vmi_a = vmi_info.calibration_constants[vmi_info.selected_setting].a;
	let vmi_b = vmi_info.calibration_constants[vmi_info.selected_setting].b;
	let r;
	let jacobian;
	for (let i = 0; i < spectra_data.ir_off_intensity.length; i++) {
		r = spectra_data.radial_values[i];
		jacobian = 2 * vmi_a * r + 4 * vmi_b * Math.pow(r, 3);
		spectra_data.normalized.ir_off_intensity[i] = spectra_data.ir_off_intensity[i] / jacobian;
	}
	// Now normalize ir_off (and ir_on) by maximum value of ir_off
	spectra_data.normalized.normalization_factor = Math.max(...spectra_data.normalized.ir_off_intensity); // "..." turns array into list of arguments
	for (let i = 0; i < spectra_data.normalized.ir_off_intensity.length; i++) {
		spectra_data.normalized.ir_off_intensity[i] /= spectra_data.normalized.normalization_factor;
	}
}

// Calculate difference spectrum (ir_on - ir_off) and return
function scan_accumulated_image_spectra_calculate_difference() {
	const spectrum_data = scan.accumulated_image.spectra.data;
	const pes_length = spectrum_data.normalized.ir_off_intensity.length;
	let difference = [];
	if (scan.accumulated_image.spectra.params.use_ebe) {
		// Calculate difference of scaled intensity(eBE)
		for (let i = 0; i < pes_length; i++) {
			difference[i] = spectrum_data.normalized.ir_on_intensity[i] - spectrum_data.normalized.ir_off_intensity[i];
			// Create plot for zero-line
			spectrum_data.zeroes[i] = 0;
		}
	} else {
		// Calculate difference of raw intensity(R)
		for (let i = 0; i < pes_length; i++) {
			difference[i] = spectrum_data.ir_on_intensity[i] - spectrum_data.ir_off_intensity[i];
			// Create plot for zero-line
			spectrum_data.zeroes[i] = 0;
		}
	}
	return difference;
}

// Reset PE Spectra data values
function scan_accumulated_image_spectra_reset() {
	const pes_spectra = scan.accumulated_image.spectra;
	// Reset arrays
	pes_spectra.data.radial_values = [];
	pes_spectra.data.ebe_values = [];
	pes_spectra.data.ir_off_intensity = [];
	pes_spectra.data.ir_off_anisotropy = [];
	pes_spectra.data.ir_on_intensity = [];
	pes_spectra.data.ir_on_anisotropy = [];
	pes_spectra.data.difference = [];
	pes_spectra.data.zeroes = [];
	pes_spectra.data.normalized.ir_off_intensity = [];
	pes_spectra.data.normalized.ir_on_intensity = [];
	// Reset logical arguments
	pes_spectra.params.use_ebe = false;
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
	if (scan.accumulated_image.spectra.params.use_ebe) {
		return scan.accumulated_image.spectra.extrema.ebe_min;
	} else {
		return scan.accumulated_image.spectra.extrema.r_min;
	}
}

// Return maximum of spectra x-axis (return ebe_max, else return r_max)
function scan_accumulated_image_spectra_extrema_get_max() {
	if (scan.accumulated_image.spectra.params.use_ebe) {
		return scan.accumulated_image.spectra.extrema.ebe_max;
	} else {
		return scan.accumulated_image.spectra.extrema.r_max;
	}
}

// Update action mode scan energy parameters
function scan_action_mode_params_energy_update(start, end, increment) {
	// If starting energy > ending energy, make increment negative to go from blue to red
	if (start > end) {
		increment *= -1;
	}
	// Update values
	scan.action_mode.params.energy.start = start;
	scan.action_mode.params.energy.end = end;
	scan.action_mode.params.energy.increment = increment;
}

// Update action mode scan absorption parameters
function scan_action_mode_params_peak_radii_update(mode, origin, new_peak) {
	if (mode === "depletion" || mode === "rel_height") {
		scan.action_mode.params.peak_radii.mode = mode;
	}
	scan.action_mode.params.peak_radii.origin = origin;
	if (!new_peak) {
		// No value was given for new peak radius
		scan.action_mode.params.peak_radii.mode = "depletion";
		scan.action_mode.params.peak_radii.new_peak = 0;
	} else {
		scan.action_mode.params.peak_radii.new_peak = new_peak;
	}
}

// Calculate total number of data points in action scan
function scan_action_mode_status_data_points_calculate() {
	let start = scan.action_mode.params.energy.start;
	let end = scan.action_mode.params.energy.end;
	let increment = scan.action_mode.params.energy.increment;
	let total = Math.ceil((end - start) / increment);
	scan.action_mode.status.data_points.total = total;
}

// Calculate peak areas from PE Spectra
function scan_action_mode_data_peak_areas_calculate() {
	// NOTE TO MARTY: This should be replaced with a Gaussian fitting procedure
	//	but for now, just add points center±2 px together
	// First get radii for origin and new peak
	// Use floor() to get rid of .5 ending of radial values
	let origin_radius = Math.floor(scan.action_mode.params.peak_radii.origin);
	let new_peak_radius = Math.floor(scan.action_mode.params.peak_radii.new_peak);
	let origin_off = 0,
		origin_on = 0,
		new_peak = 0;
	// Calculate area of origin
	for (r = origin_radius - 2; r <= origin_radius + 2; r++) {
		origin_off += scan.accumulated_image.spectra.data.ir_off_intensity[r];
		origin_on += scan.accumulated_image.spectra.data.ir_on_intensity[r];
	}
	// Calculate area of new peak
	if (new_peak_radius !== 0) {
		for (r = new_peak_radius - 2; r <= new_peak_radius + 2; r++) {
			new_peak += scan.accumulated_image.spectra.data.ir_on_intensity[r];
		}
	}
	// Return values
	return [origin_off, origin_on, new_peak];
}

// Update action mode data arrays
function scan_action_mode_data_update(data) {
	scan.action_mode.data.energies.push(data.energy);
	scan.action_mode.data.absorption.push(data.absorption);
	scan.action_mode.data.peak_areas.origin_off.push(data.origin_off);
	scan.action_mode.data.peak_areas.origin_on.push(data.origin_on);
	scan.action_mode.data.peak_areas.new_peak.push(data.new_peak);
}

// Reset action mode data arrays
function scan_action_mode_data_reset() {
	scan.action_mode.data.energies = [];
	scan.action_mode.data.absorption = [];
	scan.action_mode.data.peak_areas.origin_off = [];
	scan.action_mode.data.peak_areas.origin_on = [];
	scan.action_mode.data.peak_areas.new_peak = [];
	scan.action_mode.status.data_points.current = 0;
}

// Calculate absorption values from plot
function scan_action_mode_calculate_absorption(origin_off_area, origin_on_area, new_peak_area) {
	let mode = scan.action_mode.params.peak_radii.mode;
	let absorption_value = 0;
	if (mode === "depletion") {
		absorption_value = 1 - origin_on_area / origin_off_area;
	} else if (mode === "rel_height") {
		absorption_value = new_peak_area / origin_off_area;
	}
	if (isNaN(absorption_value)) {
		absorption_value = 0;
	}
	return absorption_value;
}

// Save action mode data to file
function scan_action_mode_save() {
	// Data is saved in columns of: energy, absorption, origin_off_area, origin_on_area, new_peak_area
	//	with a header that shows absorption mode, energy range, increment, peak radii
	let first_image = ("0" + scan.action_mode.status.first_image).slice(-2);
	let last_image = ("0" + scan.action_mode.status.last_image).slice(-2);
	let file_name = settings.save_directory.full_dir + `/action_spectrum_i${first_image}_i${last_image}.txt`;
	let params = scan.action_mode.params;
	let data = scan.action_mode.data;
	let save_string = "";
	// First add header
	save_string += "Information:\n";
	save_string += `Absorption mode: ${params.peak_radii.mode}\n`;
	save_string += `Starting energy: ${params.energy.start} cm-1\n`;
	save_string += `Ending energy: ${params.energy.end} cm-1\n`;
	save_string += `Increment: ${params.energy.increment} cm-1\n`;
	save_string += `Origin radius: ${params.peak_radii.origin} px\n`;
	save_string += `New peak radius: ${params.peak_radii.new_peak || "None"}\n\n`; // Saves as "None" if no radius was specified
	// Next add data
	save_string += "Data:\n";
	save_string += "Energy (cm-1) - Absorption - Origin Area (Off) - Origin Area (On) - New Peak Area\n";
	for (let i = 0; i < data.energies.length; i++) {
		save_string += data.energies[i] + " " + data.absorption[i] + " ";
		save_string += data.peak_areas.origin_off[i] + " " + data.peak_areas.origin_on[i] + " ";
		save_string += data.peak_areas.new_peak[i] + "\n";
	}
	// Write to file
	fs.writeFile(file_name, save_string, (error) => {
		if (error) {
			console.log("Could not save action mode data:", error);
		}
	});
}

// Check if single shot should be saved
function scan_single_shot_check(centroid_results) {
	if (scan.single_shot.saving.to_save) {
		// Create copy of image buffer and centroids
		scan.single_shot.data.image_buffer = [...centroid_results.image_buffer];
		scan.single_shot.data.image_centroids = [centroid_results.ccl_centers, centroid_results.hybrid_centers];
		// Save to file
		scan.single_shot.save();
		// Reset single shot save boolean
		scan.single_shot.saving.to_save = false;
	}
}

// Save single shot and centroids to file
function scan_single_shot_save() {
	let save_dir = settings.save_directory.full_dir + "/";
	// Save image to file
	fs.writeFile(save_dir + scan.single_shot.saving.file_name, convert_ss_image_to_string(), (err) => {
		if (err) {
			console.log(err);
		}
	});
	// Save centroids to file
	fs.writeFile(save_dir + scan.single_shot.saving.centroids_file_name, convert_ss_centroids_to_string(), (err) => {
		if (err) {
			console.log(err);
		}
	});
}

// Convert camera frame buffer to saveable string
function convert_ss_image_to_string() {
	const height = scan.accumulated_image.params.camera_height;
	const width = scan.accumulated_image.params.camera_width;
	let ss_string = "";
	let alpha_index;
	let intensity;
	// Convert to string where elements of each row are space separated
	// Since image is RGBA, need to only grab alpha values
	for (let Y = 0; Y < height; Y++) {
		for (let X = 0; X < width; X++) {
			alpha_index = 4 * (width * Y + X) + 3;
			intensity = 255 - scan.single_shot.data.image_buffer[alpha_index];
			ss_string += intensity.toString() + " ";
		}
		if (Y < height - 1) {
			ss_string += "\n";
		}
	}
	return ss_string;
}

// Convert centroids from single shot to saveable string
function convert_ss_centroids_to_string() {
	const headers = ["CCL Centroids", "Hybrid Centroids"];
	let centroids_string = "";
	for (let i = 0; i < 2; i++) {
		centroids_string += headers[i];
		centroids_string += scan.single_shot.data.image_centroids[i].map((row) => row.join(" ")).join("\n");
		if (i == 0) {
			centroids_string += "\n";
		}
	}
	return centroids_string;
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
		/**
		 * Calculate nIR wavelength based on IR energy (cm^-1)
		 * @param {number} wavenumber - IR energy (cm^-1)
		 * @returns {[number, string]} nIR wavelength (nm), selected IR mode ("nir", "iir", "mir", "fir")
		 */
		get_nir: (wavenumber) => laser_excitation_get_nir(wavenumber),
	},
	/**
	 * Convert between wavelength (nm) and wavenumbers (cm^-1)
	 * @param {number} energy - Energy to convert
	 * @returns {number} Converted energy
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

function laser_excitation_get_nir(wavenumber) {
	let nir_wl;
	let nir_wn;
	let desired_mode;
	let yag_wl = laser.excitation.wavelength.yag_fundamental; // YAG fundamental (nm)
	let yag_wn = decimal_round(laser.convert_wn_wl(yag_wl), 3); // YAG fundamental (cm^-1)
	// Figure out which energy regime wavenumber is in
	if (11355 < wavenumber && wavenumber < 14080) {
		// Near IR
		desired_mode = "nir";
		nir_wl = decimal_round(laser.convert_wn_wl(wavenumber), 4);
	} else if (4500 < wavenumber && wavenumber < 7400) {
		// Intermediate IR
		desired_mode = "iir";
		nir_wn = 2 * yag_wn - wavenumber;
		nir_wl = decimal_round(laser.convert_wn_wl(nir_wn), 4);
	} else if (2000 < wavenumber && wavenumber <= 4500) {
		// Mid IR
		desired_mode = "mir";
		nir_wn = yag_wn + wavenumber;
		nir_wl = decimal_round(laser.convert_wn_wl(nir_wn), 4);
	} else if (625 < wavenumber && wavenumber <= 2000) {
		// Far IR
		desired_mode = "fir";
		nir_wn = (3 * yag_wn - wavenumber) / 2;
		nir_wl = decimal_round(laser.convert_wn_wl(nir_wn), 4);
	} else {
		// Photon energy out of range
		console.log(`Energy of ${wavenumber} cm^-1 Out of Range`);
		return [];
	}
	return [nir_wl, desired_mode];
}

/*****************************************************************************

							OPO/A INFORMATION/CONTROL

*****************************************************************************/

const opo = {
	network: {
		client: new net.Socket(),
		config: {
			host: "localhost",
			//host: "169.254.170.155",
			port: 1315,
		},
		command: {
			get_wl: "TELLWL",
			get_motor_status: "TELLSTAT",
			move_fast: "SETSPD 1.0", //"SETSPD 3.0", // Move 3 nm/sec
			move_slow: "SETSPD 0.01", //"SETSPD 0.033", // Move 0.033 nm/sec
			move_very_slow: "SETSPD 0.001",
			move: (val) => {
				return "GOTO " + val.toFixed(3);
			},
		},
		connect: () => {
			opo.network.client.connect(opo.network.config, (error) => {
				if (error) {
					console.log(`Could not connect to OPO: ${error}`);
				}
			});
		},
		close: () => {
			opo.network.client.end();
		},
	},
	status: {
		motors_moving: false,
		current_wavelength: 0,
	},
	params: {
		lower_wl_bound: 710,
		upper_wl_bound: 880,
		expected_shift: 0, //0.257, // nm
	},
	/**
	 * Get the nIR wavelength recorded by the OPO
	 */
	get_wavelength: () => {
		opo.network.client.write(opo.network.command.get_wl, () => {});
	},
	/**
	 * Update the wavelength stored in opo object
	 * @param {number} wavelength - nIR wavelength (nm)
	 */
	update_wavelength: (wavelength) => opo_update_wavelength(wavelength),
	/**
	 * Get status of OPO motors
	 */
	get_motor_status: () => {
		opo.network.client.write(opo.network.command.get_motor_status, () => {});
	},
	/**
	 * Move OPO to specific nIR wavelength
	 * @param {number} nir_wavelength - nIR wavelength (nm)
	 */
	goto_nir: (nir_wavelength) => opo_goto_nir(nir_wavelength),
	/**
	 * Set OPO motor speed as 3 nm/sec
	 */
	move_fast: () => {
		opo.network.client.write(opo.network.command.move_fast, () => {});
	},
	/**
	 * Set OPO motor speed as 0.66 nm/sec
	 */
	move_slow: () => {
		opo.network.client.write(opo.network.command.move_slow, () => {});
	},
	move_very_slow: () => {
		opo.network.client.write(opo.network.command.move_very_slow, () => {});
	},
	/**
	 * Parse error returned by OPO
	 * @param {number} error_code - code returned by OPO
	 * @returns
	 */
	parse_error: (error_code) => opo_parse_error(error_code),
};

// Tell OPO to move to nir wavelength
function opo_goto_nir(nir_wavelength) {
	// Make sure wavelength is in proper OPO bounds
	if (nir_wavelength < opo.params.lower_wl_bound || nir_wavelength > opo.params.upper_wl_bound) {
		console.log(`Wavelength ${wl} nm is out of OPO bounds: ${lower_wl_bound} - ${upper_wl_bound}`);
		return false;
	}
	opo.status.motors_moving = true;
	console.log(`GOTO_NIR: Command sent to OPO: ${opo.network.command.move(nir_wavelength)}`);
	opo.network.client.write(opo.network.command.move(nir_wavelength), () => {});
	return true;
}

// Update nIR wavelength value given by OPO
function opo_update_wavelength(wavelength) {
	console.log("Wavelength:", wavelength);
	opo.status.current_wavelength = wavelength;
}

// Parse OPO error
function opo_parse_error(error_code) {
	if (!error_code) {
		// No error code or error_code === 0 => Successfully executed command
		return;
	}
	const opo_errors = [
		"Successfully Executed Command",
		"Invalid Command",
		"Required Window Not Open",
		"Specified Value Is Out Of Range",
		"Specified Velocity Is Out Of Safe Values",
		"A GoTo Operation Is Already Active",
		"Unable To Change Settings While Motor Movement Active",
		"No USB Voltmeter Detected",
	];
	// Print the error to console
	console.log(`OPO Error #${error_code}: ${opo_errors[error_code]}`);
}

// Receive message from OPO computer
opo.network.client.on("data", (data) => {
	// Convert to string
	data = data.toString();
	// Split data up (in case two things came at the same time)
	data = data.split("\r\n");
	// Process message(s)
	data.forEach((msg) => {
		if (msg) {
			process_opo_data(msg);
		}
	});
});

function process_opo_data(data) {
	// Get rid of newline character "/r/n"
	data = data.replace("\r\n", "");
	// Filter motor movement results, which are hexadecimal numbers
	if (data.startsWith("0x")) {
		// Note: Don't use triple equals here
		if (data == 0) {
			// Motors are done moving
			opo.status.motors_moving = false;
			return;
		}
		// Motors are still moving
		opo.status.motors_moving = true;
		return;
	}
	// Make sure it is a number (not an unexpected result)
	if (isNaN(data)) {
		console.log("Message from OPO:", data);
		return;
	}
	// Convert data to number
	data = parseFloat(data);
	// Check if it's an error code
	if (data < 10) {
		opo.parse_error(data);
		return;
	}
	// Only remaining option is it's the OPO's wavelength
	opo.update_wavelength(data);
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
	//type: "scatter",
	type: "line",
	data: {
		labels: [],
		datasets: [
			{
				data: [],
				label: "IR On",
				borderColor: "red",
				showLine: true,
				pointHitRadius: 20,
			},
			{
				data: [],
				label: "IR Off",
				borderColor: "black",
				showLine: true,
				pointHitRadius: 20,
			},
		],
	},
	options: {
		responsive: true,
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
			tooltip: {
				enabled: true,
				callbacks: {
					label: function (context) {
						// Show intensity when hovering mouse
						let label = [];
						let intensity_label = "Intensity: " + context.parsed.y.toFixed(2);
						label.push(intensity_label);
						// If showing eBE plot, also show R on the label
						// Check if not showing R plot
						if (context.label != context.dataIndex + 0.5) {
							let radius = scan.accumulated_image.spectra.data.radial_values.length - context.dataIndex - 0.5;
							let radius_label = "Radius: " + radius;
							label.push(radius_label);
						}
						return label;
					},
					title: function ([context]) {
						let x_value; // Display x value of point
						// Check if showing R plot
						if (context.label == context.dataIndex + 0.5) {
							// Showing R plot
							x_value = "R: ";
							//x_value += context.parsed.x.toFixed(1);
							x_value += context.label;
							x_value += " px";
						} else {
							// Showing eBE plot
							x_value = "eBE: ";
							x_value += context.parsed.x.toFixed(2);
							x_value += " cm-1";
						}
						return x_value;
					},
				},
			},
		},
	},
};

let melexir_worker; // Filled in with Web Worker for Melexir

/*****************************************************************************

							IR ABSORPTION CONFIGURATION

*****************************************************************************/

let absorption_display; // Will be filled in with chart for IR Absorption Profile

// Configuration for Absorption Profile
const absorption_config = {
	type: "scatter",
	data: {
		labels: [],
		datasets: [
			{
				data: [],
				//label: "Absorption",
				borderColor: "black",
				//showLine: true,
				pointHitRadius: 20,
			},
		],
	},
	options: {
		responsive: true,
		//aspectRatio: 1,
		maintainAspectRatio: false,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					text: "Absorption",
					color: "black",
					display: true,
				},
			},
			x: {
				title: {
					text: "IR Energy ( cm\u207B\u00B9 )", // \u207B is unicode for superscript "-", and \u00B9 is for superscript "1"
					color: "black",
					display: true,
				},
			},
		},
		/*elements: {
			point: {
				radius: 0,
			},
		},*/
		plugins: {
			legend: {
				display: false,
			},
		},
	},
};
