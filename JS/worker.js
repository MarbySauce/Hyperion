const melexir = require("bindings")("melexir");

// Receive message from Main Window
/*self.onmessage = function(event) {
    let image = event.data;
    // Need to make sure it's a 2D array
    // (Didn't do this in a single if statement bc if it's a 1D or 0D array, 
    //      image[0][0] would throw an error)
    if (Array.isArray(image)) {
        if (Array.isArray(image[0])) {
            if (Array.isArray(image[0][0])) {
                // Dimension is larger than 2D
                console.log("MELEXIR Worker: image needs to be a 2D array - image is too large");
                self.postMessage(null_results);
            } else {
                // It is a 2D array
                let results = melexir.process(image);
                console.log("MELEXIR Worker: Successfully process image");
                self.postMessage(results);
            }
        } else {
            // Array is only 1D
            console.log("MELEXIR Worker: image needs to be a 2D array - image is only 1D array");
            self.postMessage(null_results);
        }
    } else {
        // image is not an array
        console.log("MELEXIR Worker: image needs to be a 2D array - image is not an array");
        self.postMessage(null_results);
        self.close();
    }
}*/

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
		return;
	}
	if (received_data.method === "sevi") {
		// Need to add together the images
		let image_height = received_data.ir_off.length;
		let image_width = received_data.ir_off[0].length;
		let image = Array.from(Array(image_height), () => new Array(image_width).fill(0));
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
				image[Y][X] = received_data.ir_off[Y][X] + received_data.ir_on[Y][X];
			}
		}
		// Run Melexir and package results as ir_off
		returned_results.ir_off = melexir.process(image);
		returned_results.images_summed = true;
	} else if (received_data.method === "ir-sevi") {
		// First run Melexir for ir_off
		returned_results.ir_off = melexir.process(received_data.ir_off);
		// Then ir_on
		returned_results.ir_on = melexir.process(received_data.ir_on);
	}
	// Send message back to window with Melexir results
	self.postMessage(returned_results);
};
