/**
 * VMI Image Binning Size Enums
 */
class BinSize {
	static SMALL = new BinSize(768, "Small"); // Same size as camera AoI
	static REGULAR = new BinSize(1024, "Regular"); // (4/3)x enlargement
	static BIG = new BinSize(1536, "Big"); // 2x enlargement
	static LARGE = new BinSize(2048, "Large"); // (8/3)x enlargment
	static HUGE = new BinSize(3072, "Huge"); // 4x enlargement
	static MASSIVE = new BinSize(4096, "Massive"); // (16/3)x enlargement

	constructor(size, name) {
		this.size = size; // Bin size = (size x size) pixels^2
		this.name = name; // Display name for setting
	}
}

/**
 * Trigger Detection Enums
 */
class TriggerDetection {
	static TRIGGER_OFF = new TriggerDetection(0, "Trigger Off");
	static FALLING_EDGE = new TriggerDetection(1, "Falling Edge");
	static RISING_EDGE = new TriggerDetection(2, "Rising Edge");
	static SOFTWARE_TRIGGER = new TriggerDetection(3, "Software Trigger");

	constructor(state, name) {
		this.state = state;
		this.name = name; // Display name for setting
	}
}

/**
 * Settings Classes
 */
class Settings {
	constructor() {
		this.action = {
			move_wavelength_every_time: false,
		};

		this.autosave = {
			on: false,
			delay: 0,
		};

		this.autostop = {
			both_images: false,
		};

		this.camera = {
			AoI_width: 0,
			AoI_height: 0,
			x_offset: 0,
			y_offset: 0,
			pixel_clock: 30, // MHz
			exposure_time: 0, // ms
			gain: 0,
			gain_boost: false,
			trigger: TriggerDetection.RISING_EDGE.state,
			LED_area: {
				x_start: 0,
				x_end: 100,
				y_start: 0,
				y_end: 100,
			},
			Noise_area: {
				x_start: 0,
				x_end: 100,
				y_start: 100,
				y_end: 200,
			},
		};

		this.centroid = {
			use_hybrid_method: true,
			bin_size: BinSize.REGULAR.size,
		};

		this.detachment_laser = {
			yag_fundamental: 1064,
		};

		this.excitation_laser = {
			yag_fundamental: 1064,
			acceptance_range: 0.5,
			move_attempts: 1,
			lower_wavelength_bound: 710,
			upper_wavelength_bound: 880,
			fir_lower_wavelength_bound: 725, // Lower bound in fIR mode
			fir_upper_wavelength_bound: 765, // Upper bound in fIR mode
			in_fir_mode: false, // Whether OPO/A is using fIR crystal
			host: "localhost",
			port: 1315,
		};

		this.image_series = {
			show_menu: false,
		};

		this.melexir = {
			process_on_save: true, // Whether to run MELEXIR when image is saved (does not run on autosave)
			save_spectrum: true, // Whether to save spectrum to file
			save_best_fit: false, // Whether to save best fit to data to file
			save_residuals: false, // Whether to save residuals between fit and data to file
		};

		this.save_directory = {
			base_directory: "",
			year_directory: "",
			day_directory: "",
			full_directory: "",
		};

		this.wavemeter = {
			collection_length: 10,
			max_fail_count: 10,
			max_bad_measurements: 20,
			detachment_laser_channel: 2,
			excitation_laser_channel: 1,
		};

		this.windows = {
			main: {
				x: 0,
				y: 0,
				width: 1200,
				height: 1000,
			},
			live_view: {
				x: 0,
				y: 0,
				width: 1200,
				height: 820,
			},
		};

		this.vmi = {
			V1: {
				a: 0,
				b: 0,
			},
			V2: {
				a: 0,
				b: 0,
			},
			V3: {
				a: 0,
				b: 0,
			},
			V4: {
				a: 0,
				b: 0,
			},
		};

		this.testing = {
			do_not_save_to_file: false, // If true, don't save anything to file
		};

		this.ISBLANK = true; // Whether settings information has been filled in or not
	}
}

module.exports = { BinSize, TriggerDetection, Settings };
