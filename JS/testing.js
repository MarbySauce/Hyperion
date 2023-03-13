let num_electrons = 0;
let scan_running;
let test_bool = false;

async function start_collecting_image(MAX_ELECTRONS) {
	if (scan_running) return;

	scan_running = true;
	ipc.emit("scan-started");

	num_electrons = 0;
	let max_electrons = MAX_ELECTRONS || 100;
	let is_paused = false;

	function add_electrons_to_image(event, centroid_results) {
		if (is_paused) return;
		num_electrons += 3;
		const total_e_count = document.getElementById("TotalECount");
		total_e_count.value = num_electrons;
		if (num_electrons >= max_electrons) {
			ipc.emit("stop-collecting-image", stop_collecting_image);
		}
	}

	function update_max_electrons(value) {
		max_electrons = value;
	}

	function stop_collecting_image() {
		scan_running = false;
		ipc.emit("scan-stopped");
		remove_listeners();
		console.log("Electrons:", num_electrons);
	}

	function pause_collecting_image() {
		is_paused = true;
	}
	function resume_collecting_image() {
		is_paused = false;
	}

	function remove_listeners() {
		ipc.removeListener("update-max-electrons", update_max_electrons);
		ipc.removeListener("new-camera-frame", add_electrons_to_image);
		ipc.removeListener("pause-collecting-image", pause_collecting_image);
		ipc.removeListener("resume-collecting-image", resume_collecting_image);
		ipc.removeListener("stop-collecting-image", stop_collecting_image);
	}

	ipc.on("stop-collecting-image", stop_collecting_image);
	ipc.on("update-max-electrons", update_max_electrons);
	ipc.on("pause-collecting-image", pause_collecting_image);
	ipc.on("resume-collecting-image", resume_collecting_image);

	ipc.on("new-camera-frame", add_electrons_to_image);

	let new_value = await new Promise((resolve, reject) => {
		ipc.once("stop-collecting-image", () => {
			console.log("Image stopped");
			resolve(test_bool);
		});
	});
	console.log("New Val", new_value);

	console.log("Done");
	return true;
}

function update_max_electrons(max_electrons) {
	ipc.emit("update-max-electrons", max_electrons);
}

function pause_collecting_image() {
	ipc.emit("pause-collecting-image");
}

function resume_collecting_image() {
	ipc.emit("resume-collecting-image");
}

async function action_scan() {
	// Scan 1
	console.log("starting first scan");
	await start_collecting_image(150);
	console.log("Moving IR");
	await sleep(2000);
	console.log("Starting second scan");
	await start_collecting_image(150);
}
