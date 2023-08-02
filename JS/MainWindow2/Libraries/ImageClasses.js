const { DetachmentWavelength, ExcitationWavelength } = require("./WavelengthClasses.js");
const { WavemeterMeasurement } = require("./WavemeterClasses.js");
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

	static get do_not_save_to_file() {
		return Image._do_not_save_to_file;
	}

	static set do_not_save_to_file(bool) {
		Image._do_not_save_to_file = bool;
	}

	/* Instance methods */
	constructor() {
		this.id = 1;

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

		this.reset_image();
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

	/**
	 * Update Image ID to id
	 * @param {Number} id Image ID
	 */
	update_id(id) {
		console.log("Image class: update_id called!");
		this.id = id;
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
}

class IRImage extends Image {
	constructor() {
		super();
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
			update_messenger.update(`IR-SEVI Images i${this.id_str} has been saved! (Not really)`);
			return;
		}
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

module.exports = { Image, IRImage, EmptyIRImage, ImageType };
