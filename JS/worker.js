const melexir = require("bindings")("melexir");

// Receive message from Main Window
self.onmessage = function (event) {
	const received_data = event.data;
	const returned_results = {
		ir_off: {
			spectrum: [[], [], []],
			residuals: [[], [], []],
		},
		ir_on: {
			spectrum: [[], [], []],
			residuals: [[], [], []],
		},
		images_summed: false,
	};
	// The message passed will be an object with the following properties:
	//		method: ("sevi" or "ir-sevi") - decides whether to work up one image (ir_off + ir_on) or two images
	//		ir_off: 2D array - IR Off image
	//		ir_on:	2D array - IR On image
	if (!received_data.method) {
		// The received data was not properly formatted
		console.log("Melexir Worker: Improper message received:", received_data);
		self.postMessage(false);
		return;
	}
	// MELEXIR throws an error if the image is blank (i.e. all 0's)
	//	check by summing over all pixels
	if (received_data.method === "sevi") {
		// Need to add together the images
		let image_height = received_data.ir_off.length;
		let image_width = received_data.ir_off[0].length;
		let image = Array.from(Array(image_height), () => new Array(image_width).fill(0));
		let pixel_sum = 0;
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
				image[Y][X] = received_data.ir_off[Y][X] + received_data.ir_on[Y][X];
				pixel_sum += image[Y][X];
			}
		}
		// Make sure image is not blank
		if (pixel_sum !== 0) {
			// Run Melexir and package results as ir_off
			returned_results.ir_off = melexir.process(image);
			returned_results.images_summed = true;
		}
	} else if (received_data.method === "ir-sevi") {
		// Check that each image is not blank
		if (get_image_sum(received_data.ir_off) !== 0) {
			// Run Melexir for ir_off
			returned_results.ir_off = melexir.process(received_data.ir_off);
		}
		if (get_image_sum(received_data.ir_on) !== 0) {
			// Then ir_on
			returned_results.ir_on = melexir.process(received_data.ir_on);
		}
	}

	// Pretend to run melexir
	/*for (let i = 0; i < 384; i++) {
		returned_results.ir_off.spectrum[0].push(i + 0.5);
		returned_results.ir_off.spectrum[1].push(0);
		returned_results.ir_off.spectrum[2].push(0);
		returned_results.ir_off.residuals[0].push(i + 0.5);
		returned_results.ir_off.residuals[1].push(0);
		returned_results.ir_off.residuals[2].push(0);

		returned_results.ir_on.spectrum[0].push(i + 0.5);
		returned_results.ir_on.spectrum[1].push(0);
		returned_results.ir_on.spectrum[2].push(0);
		returned_results.ir_on.residuals[0].push(i + 0.5);
		returned_results.ir_on.residuals[1].push(0);
		returned_results.ir_on.residuals[2].push(0);
	}*/

	// Send message back to window with Melexir results
	self.postMessage(returned_results);
};

/**
 * Calculate the sum of all pixels in an image
 * @param {array} image - 2D array, accumulated image
 * @returns {number} Image sum
 */
function get_image_sum(image) {
	let sum = image.reduce((a, b) => {
		return a.concat(b);
	}).reduce((a, b) => {
		return a + b;
	});
	return sum;
}