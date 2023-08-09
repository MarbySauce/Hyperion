const melexir = require("bindings")("melexir");

// Note to Marty: I can't get MLXR to work on newer versions of Electron
// One solution is to use process.platform and process.arch to check if I'm on my M1 mac
//	(e.g. process.platform === "darwin" && process.arch === "arm64")
// If so, just return empty arrays

self.onmessage = (event) => {
	if (process.platform === "darwin" && process.arch === "arm64") {
		// Note from Marty: On my M1 mac, I can't run Melexir bc the library was compiled for x86 architecture
		// If I want to actually use Melexir, I need to use Electron v13.1.6 (potentially other versions work too, newest version does not)
		// 	and I need to compile the node addons using `node-gyp rebuild --arch=x86_64` (as opposed to `node-gyp rebuild --arch=arm64`)
		// If I want to use an arm64 version of Hyperion, I need a newer version of electron (v... as of this writing)
		// and just return blank arrays as if Melexir worked
		let melexir_results = fake_process_image(event.data);
		self.postMessage(melexir_results);
		return;
	}

	let melexir_results = process_image(event.data);

	self.postMessage(melexir_results);
};

function process_image(data) {
	if (!data) {
		console.log("MLXR Worker: No image given!");
		self.postMessage();
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

	function gauss(x, xc, s = 1, A = 1) {
		return A * Math.exp(-((x - xc) ** 2) / (2 * s ** 2));
	}
	function fake_spectrum(i, ir_spectrum = false, is_ir = false) {
		if (ir_spectrum) {
			if (is_ir) {
				return (
					gauss(i + 0.5, 70, 3, 5) +
					gauss(i + 0.5, 150, 3, 10) +
					gauss(i + 0.5, 250, 3, 7) +
					gauss(i + 0.5, 350, 3, 7) +
					gauss(i + 0.5, 400, 3, 5) +
					gauss(i + 0.5, 450, 3, 10) +
					gauss(i + 0.5, 500, 3, 10)
				);
			} else {
				return gauss(i + 0.5, 150, 3, 15) + gauss(i + 0.5, 250, 3, 10) + gauss(i + 0.5, 350, 3, 10) + gauss(i + 0.5, 450, 3, 15);
			}
		} else {
			return (
				gauss(i + 0.5, 70, 3, 5) +
				gauss(i + 0.5, 150, 3, 15) +
				gauss(i + 0.5, 250, 3, 10) +
				gauss(i + 0.5, 350, 3, 10) +
				gauss(i + 0.5, 400, 3, 5) +
				gauss(i + 0.5, 450, 3, 15) +
				gauss(i + 0.5, 500, 3, 10)
			);
		}
	}
	function noise(electrons) {
		return Math.random() * Math.sqrt(electrons);
	}

	let image_size = data?.image?.length || data?.images?.ir_off.length;
	let array_size = Math.round(image_size / 2);
	if (data.is_ir) {
		// Get sum of all pixels in image
		let sum_off = data.images.ir_off.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let sum_on = data.images.ir_on.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let electrons_off = sum_off / array_size;
		let electrons_on = sum_on / array_size;

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
		// Fill in spectrum with fake data
		for (let i = 0; i < array_size; i++) {
			results_off.spectrum[0][i] = electrons_off * fake_spectrum(i, true, false) + noise(electrons_off);
			results_off.spectrum[1][i] = -0.5 * electrons_off * fake_spectrum(i, true, false) + noise(electrons_off); // Beta = -0.5 for all
			results_on.spectrum[0][i] = electrons_on * fake_spectrum(i, true, true) + noise(electrons_on);
			results_on.spectrum[1][i] = -0.5 * electrons_on * fake_spectrum(i, true, true) + noise(electrons_on); // Beta = -0.5 for all
		}
		return { is_ir: true, results_off, results_on };
	} else {
		// Get sum of all pixels in image
		let sum = data.image.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let electrons = sum / array_size;

		let results = {
			radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
			spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
			best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
			residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
		};
		// Fill in spectrum with fake data
		for (let i = 0; i < array_size; i++) {
			results.spectrum[0][i] = electrons * fake_spectrum(i, false, false) + noise(electrons);
			results.spectrum[1][i] = -0.5 * electrons * fake_spectrum(i, false, false) + noise(electrons); // Beta = -0.5 for all
		}
		return { is_ir: false, results };
	}
}
