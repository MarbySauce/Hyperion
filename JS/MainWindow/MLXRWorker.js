const melexir = require("bindings")("melexir");
const { Image, IRImage, EmptyIRImage, ImageType, ScanInfo } = require("./Libraries/ImageClasses.js");

let settings;
// settings will have properties:
//	- use_mvlr {Boolean}
//	- options_string {String}
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

	let { options_string, save_best_fit, save_residuals } = settings;

	if (image_class.is_ir) {
		console.log("IR Images not set up yet...");
		return;
	} else {
		let accumulated_image = image_class.image;

		let results = melexir.process(accumulated_image);
		//let results = melexir.process_mlxr(options_string, save_best_fit, save_residuals, accumulated_image);
	}
}
