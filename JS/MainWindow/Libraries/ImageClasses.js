const { DetachmentWavelength, ExcitationWavelength, DetachmentMode, ExcitationMode } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");
const { PESpectrum, IRPESpectrum } = require("./PESpectrumClasses.js");
const { UpdateMessenger } = require("./UpdateMessenger.js");

// Messenger used for displaying update or error messages to the Message Display
const update_messenger = new UpdateMessenger();

class ImageType {
	/* IR Off Image */
	static IROFF = new ImageType("IROFF");
	/* IR On Image */
	static IRON = new ImageType("IRON");
	/* IR On - IR Off, only values ≥ 0 */
	static DIFFPOS = new ImageType("DIFFPOS");
	/* IR On - IR Off, only value ≤ 0 */
	static DIFFNEG = new ImageType("DIFFNEG");

	constructor(name) {
		this.name = name;
	}
}

/************************************************** 

				VMI Image Classes

**************************************************/

// Class for SEVI images
class Image {
	/* Static method */

	/** Centroiding bin size */
	static get bin_size() {
		return Image._bin_size || 100;
	}

	static set bin_size(size) {
		size = Math.round(size); // Round to an integer
		if (size > 0) Image._bin_size = size;
	}

	/** For testing purposes, whether to save images to file */
	static get do_not_save_to_file() {
		return Image._do_not_save_to_file;
	}

	static set do_not_save_to_file(bool) {
		Image._do_not_save_to_file = bool;
	}

	static get save_directory() {
		return Image._save_directory || "";
	}

	static set save_directory(dir_string) {
		Image._save_directory = dir_string;
		PESpectrum.save_directory = dir_string;
	}

	/* Instance methods */
	constructor() {
		this.counts = {
			electrons: {
				on: 0,
				off: 0,
				total: 0,
			},
			frames: {
				on: 0,
				off: 0,
				total: 0,
			},
		};

		this.vmi_info = {
			index: 0,
			mode: "V1",
			calibration_constants: {
				a: 0,
				b: 0,
			},
		};

		this.detachment_wavelength = new DetachmentWavelength();
		this.detachment_measurement = new WavemeterMeasurement();
		this.excitation_wavelength = new ExcitationWavelength();
		this.excitation_measurement = new WavemeterMeasurement();

		this.pe_spectrum = new PESpectrum();

		this.reset_image();
	}

	get id() {
		if (this._id) return this._id;
		else return (this._id = 1);
	}

	set id(val) {
		this._id = val;
		this.pe_spectrum.id = val;
	}

	/** Image ID as a ≥2 digit string */
	get id_str() {
		if (this.id < 10) return `0${this.id}`;
		else return this.id.toString();
	}

	/** Current date, formatted as MMDDYY */
	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	/** Image file name */
	get file_name() {
		return `${this.formatted_date}i${this.id_str}.i0N`;
	}

	/** IR Image file name */
	get file_name_ir() {
		return "";
	}

	/** Whether image is IR */
	get is_ir() {
		return false;
	}

	/** Whether image is an Empty Image */
	get is_empty() {
		return false;
	}

	get scan_information() {
		return new ScanInfo(this);
	}

	/**
	 * Update electron and frame counts
	 * @param {Object} centroid_results Elements:
	 * 		com_centers: Array of centroids found with CoM method, elements as [X, Y],
	 * 		hgcm_centers: Array of centroids found with HGCM method, elements as [X, Y],
	 * 		is_led_on: Boolean, whether IR LED is on in camera frame
	 */
	update_counts(centroid_results) {
		let com_count = centroid_results.com_centers.length;
		let hgcm_count = centroid_results.hgcm_centers.length;
		let total_count = com_count + hgcm_count;

		if (centroid_results.is_led_on) {
			this.counts.electrons.on += total_count;
			this.counts.frames.on++;
		} else {
			this.counts.electrons.off += total_count;
			this.counts.frames.off++;
		}
		this.counts.electrons.total += total_count;
		this.counts.frames.total++;
	}

	/**
	 * Reset electron and frame counts
	 */
	reset_counts() {
		this.counts = {
			electrons: {
				on: 0,
				off: 0,
				total: 0,
			},
			frames: {
				on: 0,
				off: 0,
				total: 0,
			},
		};
	}

	/**
	 * Added centroided electrons to accumulated image
	 * @param {Object} centroid_results Elements:
	 * 		com_centers: Array of centroids found with CoM method, elements as [X, Y],
	 * 		hgcm_centers: Array of centroids found with HGCM method, elements as [X, Y],
	 * 		is_led_on: Boolean, whether IR LED is on in camera frame
	 */
	update_image(centroid_results) {
		// Update image with electrons
		Image_update_image(this.image, centroid_results.com_centers); // CoM Centroids
		Image_update_image(this.image, centroid_results.hgcm_centers); // HGCM Centroids
	}

	/**
	 * Reset accumulated image
	 */
	reset_image() {
		let bin_size = Image.bin_size;
		this.image = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
	}

	/**
	 * Delete accumulated image (to save memory)
	 */
	delete_image() {
		// In order to save memory, delete the accumulated image when scan is complete
		this.image = [[]];
	}

	/**
	 * Save accumulated image to file
	 */
	save_image() {
		if (Image.do_not_save_to_file) {
			update_messenger.update(`SEVI Image i${this.id_str} has been saved! (Not really)`);
			return;
		}
		// Else
		const fs = require("fs");
		const path = require("path");

		let file_name = path.join(Image.save_directory, this.file_name);
		// Convert image to string
		let image_string = this.image.map((row) => row.join(" ")).join("\n");
		// Save image to file and send update on completion
		fs.writeFile(file_name, image_string, (error) => {
			if (error) {
				update_messenger.error(`SEVI Image i${this.id_str} could not be saved! Error logged to console`);
				console.log(`Could not save SEVI Image i${this.id_str}:`, error);
			} else {
				update_messenger.update(`SEVI Image i${this.id_str} has been saved to ${this.file_name}!`);
			}
		});
	}

	/**
	 * Get ImageData object with the desired image data, scaled to the desired contrast
	 * @param {ImageType} which_image - which image to return
	 * @param {number} contrast ranges from 0 to 1
	 * @returns {ImageData} selected image converted to ImageData object
	 */
	get_image_display(which_image, contrast) {
		// For the Image class, there is only one image to return so which_image is ignored
		return Image_get_image_display(this.image, contrast);
	}

	/**
	 * Update the relevant information with info from different Image class object
	 * @param {Image} image_class
	 */
	update_information(image_class) {
		// Update VMI
		this.vmi_info = image_class.vmi_info;
		// Update stored laser info
		this.detachment_wavelength = image_class.detachment_wavelength;
		this.detachment_measurement = image_class.detachment_measurement;
		this.excitation_wavelength = image_class.excitation_wavelength;
		this.excitation_measurement = image_class.excitation_measurement;
	}

	/**
	 * Return a safe copy of this image class instance (note: accumulated image is not copied)
	 * @returns {SafeImage} safe copy of this image
	 */
	copy() {
		return new SafeImage(this);
	}

	read_from_file(file_name) {
		const fs = require("fs");
		const path = require("path");

		fs.readFile(path.join(Image.save_directory, file_name), (error, data) => {
			if (error) console.log(error);
			else if (data) {
				data = data.toString();
				this.image = data.split(" \n").map((row) => row.split(" ").map((el) => parseInt(el)));
				this.image.pop();
			}
		});
	}
}

class IRImage extends Image {
	constructor() {
		super();

		this.pe_spectrum = new IRPESpectrum();
	}

	get file_name_ir() {
		return `${this.formatted_date}i${this.id_str}_IR.i0N`;
	}

	get is_ir() {
		return true;
	}

	/**
	 * Added centroided electrons to accumulated images
	 * @param {Object} centroid_results Elements:
	 * 		com_centers: Array of centroids found with CoM method, elements as [X, Y],
	 * 		hgcm_centers: Array of centroids found with HGCM method, elements as [X, Y],
	 * 		is_led_on: Boolean, whether IR LED is on in camera frame
	 */
	update_image(centroid_results) {
		let image_to_update, difference_increment;
		// Figure out whether to add to IR Off or IR On image
		if (centroid_results.is_led_on) {
			// IR On
			image_to_update = this.images.ir_on;
			difference_increment = 1;
		} else {
			// IR Off
			image_to_update = this.images.ir_off;
			difference_increment = -1;
		}
		// Update image with electrons
		Image_update_image(image_to_update, centroid_results.com_centers, this.images.difference, difference_increment); // CoM Centroids
		Image_update_image(image_to_update, centroid_results.hgcm_centers, this.images.difference, difference_increment); // HGCM Centroids
	}

	/**
	 * Reset accumulated images
	 */
	reset_image() {
		let bin_size = Image.bin_size;
		this.images = {};
		this.images.ir_off = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
		this.images.ir_on = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
		this.images.difference = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
	}

	/**
	 * Delete accumulated images (to save memory)
	 */
	delete_image() {
		// In order to save memory, delete the accumulated image when scan is complete
		this.images.ir_off = [[]];
		this.images.ir_on = [[]];
		this.images.difference = [[]];
	}

	/**
	 * Save accumulated images to file
	 */
	save_image() {
		if (Image.do_not_save_to_file) {
			update_messenger.update(`IR-SEVI Images i${this.id_str} have been saved! (Not really)`);
			return;
		}
		// Else
		const fs = require("fs");
		const path = require("path");

		let file_name = path.join(Image.save_directory, this.file_name);
		let file_name_ir = path.join(Image.save_directory, this.file_name_ir);
		// Convert images to string
		let image_string = this.images.ir_off.map((row) => row.join(" ")).join("\n");
		let image_string_ir = this.images.ir_on.map((row) => row.join(" ")).join("\n");
		// Save images to file and send updates on completion
		fs.writeFile(file_name, image_string, (error) => {
			if (error) {
				update_messenger.error(`IR-SEVI Image i${this.id_str} (IR Off) could not be saved! Error logged to console`);
				console.log(`Could not save IR-SEVI Image i${this.id_str} (IR Off):`, error);
			} else {
				update_messenger.update(`IR-SEVI Image i${this.id_str} (IR Off) has been saved to ${this.file_name}!`);
			}
		});
		fs.writeFile(file_name_ir, image_string_ir, (error) => {
			if (error) {
				update_messenger.error(`IR-SEVI Image i${this.id_str} (IR On) could not be saved! Error logged to console`);
				console.log(`Could not save IR-SEVI Image i${this.id_str} (IR On):`, error);
			} else {
				update_messenger.update(`IR-SEVI Image i${this.id_str} (IR On) has been saved to ${this.file_name_ir}!`);
			}
		});
	}

	/**
	 * Get ImageData object with the desired image data, scaled to the desired contrast
	 * @param {ImageType} which_image - which image to return
	 * @param {number} contrast ranges from 0 to 1
	 * @returns {ImageData} selected image converted to ImageData object
	 */
	get_image_display(which_image, contrast) {
		switch (which_image) {
			case ImageType.IROFF:
				return Image_get_image_display(this.images.ir_off, contrast);
			case ImageType.IRON:
				return Image_get_image_display(this.images.ir_on, contrast);
			case ImageType.DIFFPOS:
				return Image_get_image_display(this.images.difference, contrast);
			case ImageType.DIFFNEG:
				return Image_get_image_display(this.images.difference, contrast, true);
		}
	}

	/**
	 * Return a safe copy of this image class instance (note: accumulated image is not copied)
	 * @returns {SafeIRImage} safe copy of this image
	 */
	copy() {
		return new SafeIRImage(this);
	}
}

// Class for EmptyImage, which is a placeholder image for when a scan is not being taken
class EmptyIRImage extends IRImage {
	constructor() {
		super();
	}

	get is_empty() {
		return true;
	}

	update_counts() {
		return;
	}

	update_image() {
		return;
	}

	save_image() {
		// Empty Image should not be saved to file
		return;
	}
}

/***
		Image/IRImage Class Functions
***/

/**
 * Take in array with centroids (centers) and add to accumulated image (image)
 * Optionally, add centroids to difference image (difference_image)
 * @param {Array} image accumulated image - 2D array to add centroids to
 * @param {Array} centers array of centroid positions [[X,Y],...]
 * @param {Array} difference_image difference accumulated image - 2D array
 * @param {number} difference_increment amount to increment difference image pixel value (+1 for IR On, -1 for IR Off)
 */
function Image_update_image(image, centers, difference_image, difference_increment = 1) {
	let X, Y;
	let initial_width = settings?.camera?.x_AoI || 1;
	let initial_height = settings?.camera?.y_AoI || 1;
	let final_width = settings?.centroid?.bin_size || 1;
	let final_height = settings?.centroid?.bin_size || 1;
	for (let i = 0; i < centers.length; i++) {
		// Make sure centroid is not blank (i.e. [0, 0])
		//if (centers[i][0] === 0 && centers[i][1] === 0) continue;
		[X, Y] = centers[i];
		// Need to account for accumulated image size and round to ints
		X = Math.round((X * final_width) / initial_width);
		Y = Math.round((Y * final_height) / initial_height);
		if (image[Y] === undefined || image[Y][X] === undefined) {
			continue; // X,Y point is outside of image
		}
		image[Y][X]++;
		if (difference_image) difference_image[Y][X] += difference_increment;
	}
}

/**
 * Convert image into ImageData object, scaling by contrast amount
 * @param {Array} image image to convert - 2D array
 * @param {number} contrast amount to scale pixel values, ranges from 0 to 1
 * @param {boolean} display_negative_values whether to display only negative (true) or only positive (false) pixel values
 * @returns {ImageData} selected image converted to ImageData object
 */
function Image_get_image_display(image, contrast, display_negative_values = false) {
	let image_height = image.length;
	let image_width = image[0].length;
	let image_data = new ImageData(image_width, image_height);
	let pixel;
	for (let Y = 0; Y < image_height; Y++) {
		for (let X = 0; X < image_width; X++) {
			pixel = image[Y][X];
			if (pixel === 0) continue; // Pixel is 0, can just skip
			if (display_negative_values) pixel *= -1; // Invert pixel value to only show negative valued pixels
			if (pixel < 0) pixel = 0; // Make sure only pixels >= 0 are displayed
			// Adjust for contrast
			pixel *= 255 * contrast;
			if (pixel > 255) pixel = 255; // ImageData is 8bit, so max value is 255
			// Want to make pixels white -> RGBA = [255, 255, 255, 255] (at full contrast)
			for (let i = 0; i < 4; i++) {
				image_data.data[4 * (image_width * Y + X) + i] = pixel;
			}
		}
	}
	return image_data;
}

/************************************************** 

				VMI Safe Image Classes

**************************************************/

// Safe version of Image class that can't save to file, etc.
class SafeImage {
	/**
	 * @param {Image} image_class
	 */
	constructor(image_class) {
		this.id = image_class.id;

		this.counts = {
			electrons: { ...image_class.counts.electrons },
			frames: { ...image_class.counts.frames },
		};

		this.vmi_info = {
			index: image_class.vmi_info.index,
			mode: image_class.vmi_info.mode,
			calibration_constants: { ...image_class.vmi_info.calibration_constants },
		};

		this.detachment_wavelength = image_class.detachment_wavelength.copy();
		this.detachment_measurement = image_class.detachment_measurement.copy();
		this.excitation_wavelength = image_class.excitation_wavelength.copy();
		this.excitation_measurement = image_class.excitation_measurement.copy();

		this.pe_spectrum = image_class.pe_spectrum.copy();
	}

	/** Image ID as a ≥2 digit string */
	get id_str() {
		if (this.id < 10) return `0${this.id}`;
		else return this.id.toString();
	}

	/** Current date, formatted as MMDDYY */
	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	/** Image file name */
	get file_name() {
		return `${this.formatted_date}i${this.id_str}.i0N`;
	}

	/** IR Image file name */
	get file_name_ir() {
		return "";
	}

	/** Whether image is IR */
	get is_ir() {
		return false;
	}

	/** Whether image is an Empty Image */
	get is_empty() {
		return false;
	}
}

class SafeIRImage extends SafeImage {
	/**
	 *
	 * @param {IRImage} ir_image_class
	 */
	constructor(ir_image_class) {
		super(ir_image_class);
	}

	get file_name_ir() {
		return `${this.formatted_date}i${this.id_str}_IR.i0N`;
	}

	get is_ir() {
		return true;
	}
}

/************************************************** 

				Scan Info Class

**************************************************/

class ScanInfo {
	/**
	 * Get an Image or IRImage class instance with values filled out from `scan_info`
	 * @param {ScanInfo} scan_info
	 * @returns {Image | IRImage}
	 */
	static get_image_class(scan_info) {
		let image_class;
		if (scan_info.image.mode === "ir-sevi") image_class = new IRImage();
		else image_class = new Image();

		// Image information
		image_class.id = scan_info.image.id;
		// NOTE TO MARTY: Need something for PES?
		let electrons_off = scan_info.image.electrons_off;
		let electrons_on = scan_info.image.electrons_on;
		image_class.counts.electrons = {
			on: electrons_on,
			off: electrons_off,
			total: electrons_off + electrons_on,
		};
		let frames_off = scan_info.image.frames_off;
		let frames_on = scan_info.image.frames_on;
		image_class.counts.frames = {
			on: frames_on,
			off: frames_off,
			total: frames_off + frames_on,
		};

		// Laser Information
		// Detachment wavelength
		image_class.detachment_wavelength.standard.wavelength = scan_info.laser.detachment.wavelength.standard;
		let detachment_mode = DetachmentMode.get_mode_from_name(scan_info.laser.detachment.mode);
		image_class.detachment_wavelength.selected_mode = detachment_mode;
		// Detachment measurement
		image_class.detachment_measurement.raw_stats.average = scan_info.laser.detachment.measurement.average;
		image_class.detachment_measurement.raw_stats.stdev = scan_info.laser.detachment.measurement.stdev;
		image_class.detachment_measurement.reduced_stats.average = scan_info.laser.detachment.measurement.reduced_average;
		image_class.detachment_measurement.reduced_stats.stdev = scan_info.laser.detachment.measurement.reduced_stdev;
		// Excitation wavelength
		image_class.excitation_wavelength.nIR.wavelength = scan_info.laser.excitation.wavelength.nir;
		let excitation_mode = ExcitationMode.get_mode_from_name(scan_info.laser.excitation.mode);
		image_class.excitation_wavelength.selected_mode = excitation_mode;
		// Excitation measurement
		image_class.excitation_measurement.raw_stats.average = scan_info.laser.excitation.measurement.average;
		image_class.excitation_measurement.raw_stats.stdev = scan_info.laser.excitation.measurement.stdev;
		image_class.excitation_measurement.reduced_stats.average = scan_info.laser.excitation.measurement.reduced_average;
		image_class.excitation_measurement.reduced_stats.stdev = scan_info.laser.excitation.measurement.reduced_stdev;
		image_class.excitation_measurement.laser_wavelength = scan_info.laser.opo.wavelength;
		image_class.excitation_measurement.laser_offset = scan_info.laser.opo.offset;

		// VMI info
		let mode = scan_info.vmi.setting;
		let index = parseInt(mode.charAt(1)) - 1;
		image_class.vmi_info = {
			index: index,
			mode: mode,
			calibration_constants: scan_info.vmi.calibration_constants,
		};

		return image_class;
	}

	/**
	 * @param {Image | IRImage} image_class
	 */
	constructor(image_class) {
		this.image = {
			id: image_class.id,
			file_name: image_class.file_name,
			file_name_ir: image_class.file_name_ir,
			pes_file_name: image_class.pe_spectrum.pes_file_name,
			pes_file_name_ir: image_class.pe_spectrum.pes_file_name_ir,
			mode: image_class.is_ir ? "ir-sevi" : "sevi",
			electrons_off: image_class.counts.electrons.off,
			electrons_on: image_class.counts.electrons.on,
			frames_off: image_class.counts.frames.off,
			frames_on: image_class.counts.frames.on,
		};

		this.laser = {
			detachment: {
				mode: image_class.detachment_wavelength.selected_mode.name,
				measurement: {
					average: parseFloat(image_class.detachment_measurement.raw_stats.average.toFixed(4)),
					stdev: parseFloat(image_class.detachment_measurement.raw_stats.stdev.toFixed(5)),
					reduced_average: parseFloat(image_class.detachment_measurement.reduced_stats.average.toFixed(4)),
					reduced_stdev: parseFloat(image_class.detachment_measurement.reduced_stats.stdev.toFixed(5)),
				},
				wavelength: {
					standard: parseFloat(image_class.detachment_wavelength.standard.wavelength.toFixed(3)),
					doubled: parseFloat(image_class.detachment_wavelength.doubled.wavelength.toFixed(3)),
					raman: parseFloat(image_class.detachment_wavelength.raman.wavelength.toFixed(3)),
					irdfg: parseFloat(image_class.detachment_wavelength.irdfg.wavelength.toFixed(3)),
					yag_fundamental: parseFloat(image_class.detachment_wavelength.YAG_wl.toFixed(3)),
				},
				wavenumber: {
					standard: parseFloat(image_class.detachment_wavelength.standard.wavenumber.toFixed(3)),
					doubled: parseFloat(image_class.detachment_wavelength.doubled.wavenumber.toFixed(3)),
					raman: parseFloat(image_class.detachment_wavelength.raman.wavenumber.toFixed(3)),
					irdfg: parseFloat(image_class.detachment_wavelength.irdfg.wavenumber.toFixed(3)),
					yag_fundamental: parseFloat(image_class.detachment_wavelength.YAG_wn.toFixed(3)),
				},
			},

			excitation: {
				mode: image_class.excitation_wavelength.selected_mode.name,
				measurement: {
					average: parseFloat(image_class.excitation_measurement.raw_stats.average.toFixed(4)),
					stdev: parseFloat(image_class.excitation_measurement.raw_stats.stdev.toFixed(5)),
					reduced_average: parseFloat(image_class.excitation_measurement.reduced_stats.average.toFixed(4)),
					reduced_stdev: parseFloat(image_class.excitation_measurement.reduced_stats.stdev.toFixed(5)),
				},
				wavelength: {
					nir: parseFloat(image_class.excitation_wavelength.nIR.wavelength.toFixed(3)),
					iir: parseFloat(image_class.excitation_wavelength.iIR.wavelength.toFixed(3)),
					mir: parseFloat(image_class.excitation_wavelength.mIR.wavelength.toFixed(3)),
					fir: parseFloat(image_class.excitation_wavelength.fIR.wavelength.toFixed(3)),
					yag_fundamental: parseFloat(image_class.excitation_wavelength.YAG_wl.toFixed(3)),
				},
				wavenumber: {
					nir: parseFloat(image_class.excitation_wavelength.nIR.wavenumber.toFixed(3)),
					iir: parseFloat(image_class.excitation_wavelength.iIR.wavenumber.toFixed(3)),
					mir: parseFloat(image_class.excitation_wavelength.mIR.wavenumber.toFixed(3)),
					fir: parseFloat(image_class.excitation_wavelength.fIR.wavenumber.toFixed(3)),
					yag_fundamental: parseFloat(image_class.excitation_wavelength.YAG_wn.toFixed(3)),
				},
			},

			opo: {
				wavelength: parseFloat(image_class.excitation_measurement.laser_wavelength.toFixed(3)),
				offset: parseFloat(image_class.excitation_measurement.laser_offset.toFixed(3)),
			},
		};

		this.vmi = {
			setting: image_class.vmi_info.mode,
			calibration_constants: image_class.vmi_info.calibration_constants,
			all_constants: undefined, // This will be filled in by Image Manager before saving to file
		};
	}
}

module.exports = { Image, IRImage, EmptyIRImage, ImageType, ScanInfo, SafeImage, SafeIRImage };
