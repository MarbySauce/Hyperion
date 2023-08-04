const melexir = require("bindings")("melexir");
const { Image, IRImage, EmptyIRImage, ImageType, ScanInfo } = require("./Libraries/ImageClasses.js");

// Note to Marty: I can't get MLXR to work on newer versions of Electron
// One solution is to use process.platform and process.arch to check if I'm on my M1 mac
//	(e.g. process.platform === "darwin" && process.arch === "arm64")
// If so, just return empty arrays

let settings;
// settings will have properties:
//	- use_mvlr {Boolean}
//	- i2d_options_string {String}
//	- mlxr_options_string {String}
//	- mvlr_options_string {String}
//	- save_best_fit {Boolean}
//	- save_residuals {Boolean}

let image_class = new EmptyIRImage(); // {Image | IRImage}

self.onmessage = (event) => {
	if (event.data.type === "settings") {
		settings = event.data.message;
	} else if (event.data.type === "image") {
		image_class = event.data.message;
		process_image();
	}
};

function process_image() {
	if (!settings) {
		console.log("MLXR Worker: Settings have not been set up!");
		return;
	}

	let { save_best_fit, save_residuals } = settings;

	if (image_class.is_ir) {
		console.log("IR Images not set up yet...");
		return;
	} else {
		let accumulated_image = image_class.image;

		console.log("Starting process!");

		let results = melexir.process(accumulated_image);

		console.log(results);
	}
}
