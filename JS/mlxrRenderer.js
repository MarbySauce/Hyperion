const ipc = require("electron").ipcRenderer;
const melexir = require("bindings")("melexir");

ipc.on("run_mlxr", (event, data) => {
    if (process.platform === "darwin" && process.arch === "arm64") {
		// Note from Marty: On my M1 mac, I can't run Melexir bc the library was compiled for x86 architecture
		// If I want to actually use Melexir, I need to use Electron v13.1.6 (potentially other versions work too, newest version does not)
		// 	and I need to compile the node addons using `node-gyp rebuild --arch=x86_64` (as opposed to `node-gyp rebuild --arch=arm64`)
		// If I want to use an arm64 version of Hyperion, I need a newer version of electron (v... as of this writing)
		// and just return blank arrays as if Melexir worked
		let melexir_results = fake_process_image(data);
		ipc.send("mlxr_results", melexir_results);
		return;
	}

	let melexir_results = process_image(data);
    ipc.send("mlxr_results", melexir_results);
});


function process_image(data) {
	if (!data) {
		console.log("MLXR Worker: No image given!");
		ipc.send("mlxr_results", melexir_results);
		return;
	}

	if (data.is_ir) {
		// Get sum of all pixels in image
		let sum_off = data.images.ir_off.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let sum_on = data.images.ir_on.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);

		// If images are blank Melexir may crash -> don't process blank images
		let results_off, results_on;
		if (sum_off > 0) results_off = melexir.process(data.images.ir_off);
		if (sum_on > 0) results_on = melexir.process(data.images.ir_on);
		return { is_ir: true, results_off, results_on };
	} else {
		// Get sum of all pixels in image
		let sum = data.image.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);

		// If images are blank Melexir may crash -> don't process blank images
		let results;
		if (sum > 0) results = melexir.process(data.image);
		return { is_ir: false, results };
	}
}

function fake_process_image(data) {
	// Iterable function for quickly filling arrays
	function* array_fill(length, initial_value = 0, increment = 0) {
		let value = initial_value;
		for (let i = 0; i < length; i++) {
			yield value;
			value += increment;
		}
	}

	let image_size = data?.image?.length || data?.images?.ir_off.length;
	let array_size = Math.round(image_size / 2);
	if (data.is_ir) {
		let results_off = {
			radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
			spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
			best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
			residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
		};
		let results_on = {
			radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
			spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
			best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
			residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
		};
		return { is_ir: true, results_off, results_on };
	} else {
		let results = {
			radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
			spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
			best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
			residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
		};
		return { is_ir: false, results };
	}
}
