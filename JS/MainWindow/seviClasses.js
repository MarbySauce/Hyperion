/************************************************** 

				VMI Image Classes

**************************************************/

// Class for SEVI images
class Image {
	constructor() {
		this.id = 1;
		this.is_ir = false;

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

		this.reset_image();
	}

	get id_str() {
		if (this.id < 10) return `0${this.id}`;
		else return this.id.toString();
	}

	/* Current date, formatted as MMDDYY */
	get formatted_date() {
		let today = new Date();
		let day = ("0" + today.getDate()).slice(-2);
		let month = ("0" + (today.getMonth() + 1)).slice(-2);
		let year = today.getFullYear().toString().slice(-2);
		return month + day + year;
	}

	get file_name() {
		return `${this.formatted_date}i${this.id_str}.i0N`;
	}

	get file_name_ir() {
		return "";
	}

	update_id(id) {
		this.id = id;
	}

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

	update_image(centroid_results) {
		// Update image with electrons
		Image_update_image(this.image, centroid_results.com_centers); // CoM Centroids
		Image_update_image(this.image, centroid_results.hgcm_centers); // HGCM Centroids
	}

	reset_image() {
		// If settings hasn't been filled in, the ?. operator returns undefined without throwing an error
		// so bin_size will then default to 100.
		let bin_size = settings?.centroid?.bin_size || 100;
		this.image = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
	}

	delete_image() {
		// In order to save memory, delete the accumulated image when scan is complete
		this.image = [[]];
	}

	save_image() {
		console.log(`Image i${this.id_str} has been saved! (Not really)`);
	}

	/**
	 * Get ImageData object with the desired image data, scaled to the desired contrast
	 * @param {string} which_image Either "IROFF", "IRON", "DIFFPOS", or "DIFFNEG" - which image to return
	 * @param {number} contrast ranges from 0 to 1
	 * @returns {ImageData} selected image converted to ImageData object
	 */
	get_image_display(which_image, contrast) {
		// For the Image class, there is only one image to return so which_image is ignored
		return Image_get_image_display(this.image, contrast);
	}
}

class IRImage extends Image {
	constructor() {
		super();
		this.is_ir = true;
	}

	get file_name_ir() {
		return `${this.formatted_date}i${this.id_str}_IR.i0N`;
	}

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

	reset_image() {
		// If settings hasn't been filled in, the ?. operator returns undefined without throwing an error
		// so bin_size will then default to 100.
		let bin_size = settings?.centroid?.bin_size || 100;
		this.images = {};
		this.images.ir_off = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
		this.images.ir_on = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
		this.images.difference = Array.from(Array(bin_size), () => new Array(bin_size).fill(0));
	}

	delete_image() {
		// In order to save memory, delete the accumulated image when scan is complete
		this.images.ir_off = [[]];
		this.images.ir_on = [[]];
		this.images.difference = [[]];
	}

	save_image() {
		console.log(`IR Image i${this.id_str} has been saved! (Not really)`);
	}

	/**
	 * Get ImageData object with the desired image data, scaled to the desired contrast
	 * @param {string} which_image Either "IROFF", "IRON", "DIFFPOS", or "DIFFNEG" - which image to return
	 * @param {number} contrast ranges from 0 to 1
	 * @returns {ImageData} selected image converted to ImageData object
	 */
	get_image_display(which_image, contrast) {
		switch (which_image) {
			case "IROFF":
				return Image_get_image_display(this.images.ir_off, contrast);
			case "IRON":
				return Image_get_image_display(this.images.ir_on, contrast);
			case "DIFFPOS":
				return Image_get_image_display(this.images.difference, contrast);
			case "DIFFNEG":
				return Image_get_image_display(this.images.difference, contrast, true);
		}
	}
}

// Class for EmptyImage, which is a placeholder image for when a scan is not being taken
class EmptyIRImage extends IRImage {
	constructor() {
		super();

		this.is_empty = true;
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

module.exports = { Image, IRImage, EmptyIRImage };
