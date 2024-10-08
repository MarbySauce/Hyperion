const ipc = require("electron").ipcRenderer;
const melexir = require("bindings")("melexir");

ipc.on("run-mlxr", (event, data) => {
	if (process.platform === "darwin" && process.arch === "arm64") {
		// Note from Marty: On my M1 mac, I can't run Melexir bc the library was compiled for x86 architecture
		// If I want to actually use Melexir, I need to use Electron v13.1.6 (potentially other versions work too, newest version does not)
		// 	and I need to compile the node addons using `node-gyp rebuild --arch=x86_64` (as opposed to `node-gyp rebuild --arch=arm64`)
		// If I want to use an arm64 version of Hyperion, I need a newer version of electron (v... as of this writing)
		// and just return blank arrays as if Melexir worked
		let melexir_results = fake_process_image(data);
		ipc.send("mlxr-results", melexir_results);
		return;
	}

	let melexir_results = process_image(data);
	ipc.send("mlxr-results", melexir_results);
});

function process_image(data) {
	if (!data) {
		console.log("MLXR Worker: No image given!");
		ipc.send("mlxr-results", melexir_results);
		return;
	}

	if (data.is_ir) {
		// Get sum of all pixels in image
		let sum_off = data.images.ir_off.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let sum_on = data.images.ir_on.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);

		// If images are blank Melexir may crash -> don't process blank images
		let results_off, results_on;
		if (sum_off > 0) {
			results_off = melexir.process(data.images.ir_off);
		} else {
			results_off = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
		}
		if (sum_on > 0) {
			results_on = melexir.process(data.images.ir_on);
		} else {
			results_on = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
		}
		return { is_ir: true, results_off, results_on };
	} else {
		// Get sum of all pixels in image
		let sum = data.image.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);

		// If images are blank Melexir may crash -> don't process blank images
		let results = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
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
	function noise(electrons, i) {
		if (i < 25) return Math.random();
		return Math.random() * Math.sqrt(electrons);
	}
	function gs_spectrum(i) {
		return gauss(i + 0.5, 100, 3, 0.2) + gauss(i + 0.5, 200, 3, 0.5) + gauss(i + 0.5, 300, 3, 0.7); // + gauss(i + 0.5, 400, 3, 1.0);
	}
	function es_spectrum(i) {
		return (
			gauss(i + 0.5, 50, 3, 0.1) +
			gauss(i + 0.5, 150, 3, 0.2) +
			gauss(i + 0.5, 250, 3, 0.35) +
			gauss(i + 0.5, 350, 3, 0.1) +
			gauss(i + 0.5, 380, 3, 0.1) +
			gauss(i + 0.5, 410, 3, 0.05) +
			gauss(i + 0.5, 440, 3, 0.05)
		);
	}
	function ir_off_spectrum(i, electrons) {
		return electrons * gs_spectrum(i) + noise(electrons, i);
	}
	function ir_off_anisotropy(i, electrons, beta) {
		return electrons * beta * gs_spectrum(i) + noise(electrons, i);
	}
	function ir_on_spectrum(i, electrons, wn, center_wn) {
		let excited = 0.5;
		if (center_wn) excited = gauss(wn, center_wn, 1.2, 0.25);
		return electrons * ((1 - excited) * gs_spectrum(i) + excited * es_spectrum(i)) + noise(electrons, i);
	}
	function ir_on_anisotropy(i, electrons, beta_gs, beta_es, wn, center_wn) {
		let excited = 0.5;
		if (center_wn) excited = gauss(wn, center_wn, 1.2, 0.25);
		return electrons * ((1 - excited) * beta_gs * gs_spectrum(i) + excited * beta_es * es_spectrum(i)) + noise(electrons, i);
	}

	let image_size = data?.image?.length || data?.images?.ir_off.length;
	let array_size = Math.round(image_size / 2);
	if (data.is_ir) {
		// Get sum of all pixels in image
		let sum_off = data.images.ir_off.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let sum_on = data.images.ir_on.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let electrons_off = sum_off / array_size;
		let electrons_on = sum_on / array_size;

		let results_off, results_on;

		if (sum_off > 0) {
			results_off = {
				radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
				spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
				best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
				residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
			};
			// Fill in spectrum with fake data
			for (let i = 0; i < array_size; i++) {
				results_off.spectrum[0][i] = ir_off_spectrum(i, electrons_off);
				results_off.spectrum[1][i] = ir_off_anisotropy(i, electrons_off, -0.5);
			}
		} else {
			results_off = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
		}
		if (sum_on > 0) {
			results_on = {
				radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
				spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
				best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
				residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
			};
			// Fill in spectrum with fake data
			for (let i = 0; i < array_size; i++) {
				results_on.spectrum[0][i] = ir_on_spectrum(i, electrons_on, data?.wn, data?.center_wn);
				results_on.spectrum[1][i] = ir_on_anisotropy(i, electrons_on, -0.5, 1.8, data?.wn, data?.center_wn);
			}
		} else {
			results_on = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
		}
		return { is_ir: true, results_off, results_on };
	} else {
		// Get sum of all pixels in image
		let sum = data.image.map((row) => row.reduce((a, c) => a + c)).reduce((a, c) => a + c);
		let electrons = sum / array_size;

		let results;
		if (sum > 0) {
			results = {
				radii: [...array_fill(array_size, 0.5, 1)], // Fill array as [0.5, 1.5, 2.5...]
				spectrum: [[...array_fill(array_size)], [...array_fill(array_size)]], // Fill with all 0's
				best_fit: [[...array_fill(array_size)], [...array_fill(array_size)]],
				residuals: [[...array_fill(array_size)], [...array_fill(array_size)]],
			};
			// Fill in spectrum with fake data
			for (let i = 0; i < array_size; i++) {
				results.spectrum[0][i] = ir_off_spectrum(i, electrons);
				results.spectrum[1][i] = ir_off_anisotropy(i, electrons, -0.5);
			}
		} else {
			results = { radii: [0.5], spectrum: [[0], [0]], residuals: [[0], [0]], best_fit: [[0], [0]] };
		}
		return { is_ir: false, results };
	}
}
