/*
	This is a list of all functions used in main window Renderer

	For some reason it's necessary to wrap .onclick and .oninput functions with function(){}
*/

/*


*/
/*			Event Listeners			*/
/*


*/

// Startup
window.onload = function () {
	// Send message to main process that the window is ready
	ipc.send("main-window-ready", null);
};

/*		Tabs		*/

document.getElementById("SeviMode").onclick = function () {
	// SEVI mode tab
	switch_tabs(0);
};
document.getElementById("IRSeviMode").onclick = function () {
	// IR SEVI mode tab
	switch_tabs(1);
};
document.getElementById("IRActionMode").onclick = function () {
	// IR Action mode tab
	switch_tabs(2);
};
document.getElementById("Settings").onclick = function () {
	// Settings tab
	switch_tabs(8);
};

/*		Sevi and IR-Sevi Mode		*/

// Scan control buttons
document.getElementById("ScanStartSave").onclick = function () {
	sevi_start_save_button();
};

// PE Spectrum control buttons
document.getElementById("CalculateSpectrumButton").onclick = function () {
	run_melexir();
};
document.getElementById("SpectrumXLower").oninput = function () {
	change_spectrum_x_display_range();
};
document.getElementById("SpectrumXUpper").oninput = function () {
	change_spectrum_x_display_range();
};

// Page Up/Down buttons
document.getElementById("SeviPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
	create_spectrum_plot(); // Create plot for PE Spectrum
};
document.getElementById("SeviPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		IR Action Mode		*/

document.getElementById("IRActionPageDown").onclick = function () {
	switch_pages(1); // Switch to second page
};
document.getElementById("IRActionPageUp").onclick = function () {
	switch_pages(0); // Switch to first page
};

/*		Settings		*/

document.getElementById("SaveSettingsButton").onclick = function () {
	// Save settings button
	SaveSettings();
};

/*


*/
/*			Event Listener Functions			*/
/*


*/

/*		Startup		*/

// Execute various functions on application startup
function startup() {
	// Go to Sevi Mode tab (ID = 0)
	switch_tabs(0);

	// Color the accumulated image display black
	//fill_image_display();
}

/*		Tabs		*/

// Depress all of the buttons (to behave like a radio button)
// and then activate the tab 'Tab'
function switch_tabs(tab) {
	// Tab name should be an integer corresponding to the index of tabList
	// 		Some tabs are left empty and can be filled in if a new tab is added in the future
	// 0 => SEVI mode, 1 => IR-SEVI Mode, 2 => IR Action Mode,
	// 3 => blank, 4 => blank, 5 => blank, 6 => blank, 7 => blank,
	// 8 => Settings section
	//
	// If you only want to hide all tabs and show nothing,
	// call the function with no parameters

	// List of each tab section
	const tab_list = [
		document.getElementById("SeviMode"),
		document.getElementById("IRSeviMode"),
		document.getElementById("IRActionMode"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("Settings"),
	];

	// Content corresponding to each tab
	const content_list = [
		document.getElementById("SeviModeContent"),
		document.getElementById("SeviModeContent"),
		document.getElementById("IRActionModeContent"),
		null,
		null,
		null,
		null,
		null,
		document.getElementById("SettingsContent"),
	];

	// Depress the current tab and hide content
	tab_list[page_info.current_tab].classList.remove("pressed-tab");
	content_list[page_info.current_tab].style.display = "none";

	// Make sure the tab argument passed is an integer corresponding to a real tab
	if (!tab_list[tab]) {
		console.log("Returned");
		return;
	}

	// Store the current tab info
	page_info.current_tab = tab;

	// Activate selected tab and show content
	tab_list[tab].classList.add("pressed-tab");
	content_list[tab].style.display = "grid";

	// If a scan is not currently being taken, switch the scan method (if relevant)
	let sevi_methods = ["sevi", "ir-sevi", "ir-action"];
	if (!scan.status.running && sevi_methods[tab]) {
		scan.status.method = sevi_methods[tab];
	}

	// If chosen tab is Sevi or IR-Sevi mode, we have to do a bit more
	// since IR-SEVI is just Sevi with a few more elements shown
	if (tab <= 1) {
		// Remove class of the tab not chosen (e.g. remove "sevi-mode" if ir-sevi chosen)
		content_list[tab].classList.remove(sevi_methods[(tab + 1) % 2] + "-mode");
		// Add class of the chosen tab
		content_list[tab].classList.add(sevi_methods[tab] + "-mode");
	}

	// Lastly, make sure we switch to the first page (if there are two)
	switch_pages(0);
}

// Switch between first and second page
function switch_pages(page_index) {
	// page_index = 0 to switch to first page, 1 to switch to second
	let page_prefix;
	if (page_info.current_tab <= 1) {
		// Currently on Sevi or IR-Sevi tab
		page_prefix = "Sevi";
	} else if (page_info.current_tab == 2) {
		// Currently on IR Action tab
		page_prefix = "IRAction";
	} else {
		// Currently on a tab without pages, just return
		// Note: need to add another "else if" if you add another tab with two pages
		return;
	}

	const first_page = document.getElementById(page_prefix + "FirstPage");
	const second_page = document.getElementById(page_prefix + "SecondPage");

	if (page_index === 0) {
		// Display first page
		first_page.style.display = "grid";
		second_page.style.display = "none";

		// PE Spectrum is on second page, and needs to be destroyed if moving to first page
		//	(if it exists)
		if (spectrum_display) {
			destroy_spectrum_plot();
		}
	} else if (page_index === 1) {
		// Display second page
		first_page.style.display = "none";
		second_page.style.display = "grid";
	}
}

/* Sevi and IR-Sevi Modes */

// Update electron counter displays
function update_counter_displays() {
	const total_frames = document.getElementById("TotalFrames");
	const total_frames_ir = document.getElementById("TotalFramesIROn");
	const total_e_count = document.getElementById("TotalECount");
	const total_e_count_ir = document.getElementById("TotalECountIROn");
	const avg_e_count = document.getElementById("AvgECount");
	const avg_e_count_ir = document.getElementById("AvgECountIROn");

	let frame_count_off = electrons.total.frame_count.ir_off;
	let frame_count_on = electrons.total.frame_count.ir_on;
	let e_count_off = electrons.total.e_count.ir_off;
	let e_count_on = electrons.total.e_count.ir_on;
	let avg_off = electrons.average.mode.ir_off_value;
	let avg_on = electrons.average.mode.ir_on_value;

	// If on Sevi mode tab, total values = ir_off + ir_on
	if (page_info.current_tab === 0) {
		total_frames.value = frame_count_off + frame_count_on;
		total_e_count.value = e_count_off + e_count_on;
		avg_e_count.value = ((avg_off + avg_on) / 2).toFixed(2);
	} else {
		total_frames.value = frame_count_off;
		total_frames_ir.value = frame_count_on;
		total_e_count.value = e_count_off;
		total_e_count_ir.value = e_count_on;
		avg_e_count.value = avg_off.toFixed(2);
		avg_e_count_ir.value = avg_on.toFixed(2);
	}

	// NOTE TO MARTY: Change this to add ir_on and ir_off based on tab, not scan status
	// The displayed file name should change based on status tho (so you can see which mode it's running in)
	// if it's possible it would be cool to have the IR file name displayed even when on Sevi tab
}

// Functionality for Sevi Mode Start/Save button
function sevi_start_save_button() {
	// Since the scan running status gets changed in the process, we need a constant value
	//	that tells whether the scan was just started or ended
	let was_running = scan.status.running;
	// Change button text appropriately
	update_start_save(was_running);
	// Start or stop the scan (and save if stopped)
	update_scan_running_status(was_running, true);
	// Reset electron and frame counts if new scan started
	electrons.reset(was_running);
	// Reset accumulated image if new scan started
	scan.reset_images(was_running);
}

// Update Start/Save button on press
// was_running is bool that says whether a scan was running when button pressed
function update_start_save(was_running) {
	const start_button_text = document.getElementById("ScanStartSaveText");

	// If a scan has not been started, change text to "Save"
	//	otherwise change to "Start"
	if (was_running) {
		start_button_text.innerText = "Start";
	} else {
		start_button_text.innerText = "Save";
	}
}

// Update the scan "running" status
// was_running is bool that says whether a scan was running when button pressed
// if_save is bool that tells whether to save image/spectra to file
function update_scan_running_status(was_running, if_save) {
	// First check if we need to save (i.e. if a scan just finished)
	if (was_running && if_save) {
		console.log("File saved!");
	}
	// Change running status
	scan.status.running = !was_running;
}

// Update the accumulated image display
function update_accumulated_image_display() {
	// First check if a scan is currently being taken
	if (!scan.status.running || scan.status.paused) {
		// Don't update the images
		return;
	}
	const image_select = document.getElementById("ImageDisplaySelect");
	const image_display = document.getElementById("Display");
	const ctx = image_display.getContext("2d");
	const display_slider_value = parseFloat(document.getElementById("DisplaySlider").value);
	let image_height = scan.accumulated_image.params.accumulation_height;
	let image_width = scan.accumulated_image.params.accumulation_width;
	let image_data = new ImageData(image_width, image_height); //ctx.getImageData(0, 0, image_width, image_height);
	let displayed_image;
	let image_pixel;
	let display_positive = true; // If false, display only negative values (for difference image)

	// Clear the current image
	ctx.clearRect(0, 0, image_display.width, image_display.height);

	if (page_info.current_tab === 0) {
		// On Sevi Mode tab, display ir_off + ir_on
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
				image_pixel = scan.accumulated_image.images.ir_off[Y][X];
				image_pixel += scan.accumulated_image.images.ir_on[Y][X];
				// If the pixel is zero we can just skip it
				if (image_pixel === 0) {
					continue;
				}
				// Adjust for contrast
				image_pixel = 255 * image_pixel * display_slider_value;
				// If image_pixel is oversaturated, set to 255
				if (image_pixel > 255) {
					image_pixel = 255;
				}
				// Want to make pixels white -> RGBA = [255, 255, 255, 255] (at full contrast)
				for (let i = 0; i < 4; i++) {
					image_data.data[4 * (image_width * Y + X) + i] = image_pixel;
				}
			}
		}
	} else if (page_info.current_tab === 1) {
		// On IR-Sevi tab, display selected image
		switch (image_select.selectedIndex) {
			case 0:
				// IR Off
				displayed_image = scan.accumulated_image.images.ir_off;
				break;
			case 1:
				// IR On
				displayed_image = scan.accumulated_image.images.ir_on;
				break;
			case 2:
				// Difference positive (need to calculate difference first)
				displayed_image = scan.accumulated_image.images.difference;
				break;
			case 3:
				// Difference negative (need to calculate difference first)
				display_positive = false;
				displayed_image = scan.accumulated_image.images.difference;
				break;
			default:
				// Just display IR Off
				displayed_image = scan.accumulated_image.images.ir_off;
				break;
		}
		for (let Y = 0; Y < image_height; Y++) {
			for (let X = 0; X < image_width; X++) {
				image_pixel = displayed_image[Y][X];
				// If the pixel is zero we can just skip it
				if (image_pixel === 0) {
					continue;
				}
				// For difference image, figure out if positive or negative values should be shown
				if (display_positive) {
					// Only display positive differences
					if (image_pixel < 0) {
						image_pixel = 0;
					}
				} else {
					// Only display negative differences
					image_pixel = -image_pixel; // Invert values
					if (image_pixel < 0) {
						image_pixel = 0;
					}
				}
				// Adjust for contrast
				image_pixel = 255 * image_pixel * display_slider_value;
				// If image_pixel is oversaturated, set to 255
				if (image_pixel > 255) {
					image_pixel = 255;
				}
				// Want to make pixels white -> RGBA = [255, 255, 255, 255] (at full contrast)
				for (let i = 0; i < 4; i++) {
					image_data.data[4 * (image_width * Y + X) + i] = image_pixel;
				}
			}
		}
	}
	// Put image_data on the display
	// Have to do this bullshit so that the image is resized to fill the display correctly
	// (turning the ImageData object into a BMP image and then using drawImage to put it on the canvas)
	createImageBitmap(image_data).then(function (bitmap_img) {
		ctx.drawImage(bitmap_img, 0, 0, image_width, image_height, 0, 0, image_display.width, image_display.height);
	});
}

// Create chart to plot PE Spectrum
function create_spectrum_plot() {
	const spectrum_display_ctx = document.getElementById("PESpectrum").getContext("2d");
	spectrum_display = new Chart(spectrum_display_ctx, spectrum_config);
}

// Destroy PE Spectrum chart
function destroy_spectrum_plot() {
	spectrum_display.destroy();
	spectrum_display = null;
}

// Run Melexir in Web Worker
function run_melexir() {
	// If the worker was already created, it must still be running, so just return
	if (melexir_worker) {
		return;
	}
	// If there are no accumulated images made, return
	if (scan.accumulated_image.images.ir_off.length === 0) {
		return;
	}
	melexir_worker = new Worker("../JS/worker.js");
	// Prepare data to send
	let sent_data = {
		ir_off: scan.accumulated_image.images.ir_off,
		ir_on: scan.accumulated_image.images.ir_on,
		method: scan.status.method,
	};
	// Send message to worker
	melexir_worker.postMessage(sent_data);
	// Store results
	melexir_worker.onmessage = function (event) {
		let returned_results = event.data;
		scan.accumulated_image.spectra.data.radial_values = returned_results.ir_off.spectrum[0];
		// Do something here to get eBE
		scan.accumulated_image.spectra.data.ir_off_intensity = returned_results.ir_off.spectrum[1];
		scan.accumulated_image.spectra.data.ir_off_anisotropy = returned_results.ir_off.spectrum[2];
		scan.accumulated_image.spectra.data.ir_on_intensity = returned_results.ir_on.spectrum[1];
		scan.accumulated_image.spectra.data.ir_on_anisotropy = returned_results.ir_on.spectrum[2];
		// Display results on spectrum
		chart_spectrum_results();
		// Terminate worker
		melexir_worker.terminate();
		melexir_worker = null;
	};
}

// Display PE Spectrum on chart
function chart_spectrum_results() {
	// Check if the chart exists
	if (!spectrum_display) {
		return;
	}
	// Used to shorted code
	const spectrum_data = scan.accumulated_image.spectra.data;
	// Check if eBE array is empty
	if (scan.accumulated_image.spectra.data.eBE_values.length === 0) {
		// eBE was not calculated, show radial plot
		spectrum_display.data.labels = spectrum_data.radial_values;
	} else {
		// Use eBE
		spectrum_display.data.labels = spectrum_data.eBE_values;
	}
	// Update ir_on data
	spectrum_display.data.datasets[0].data = spectrum_data.ir_on_intensity;
	// Update ir_off data
	spectrum_display.data.datasets[1].data = spectrum_data.ir_off_intensity;
	// Update chart
	spectrum_display.update();
}

function change_spectrum_x_display_range() {
	const x_range_min = parseFloat(document.getElementById("SpectrumXLower").value);
	const x_range_max = parseFloat(document.getElementById("SpectrumXUpper").value);
	if (!spectrum_display) {
		return;
	}
	spectrum_display.options.scales.x.min = x_range_min;
	spectrum_display.options.scales.x.max = x_range_max;
	spectrum_display.update();
}

/*


*/
/*			IPC Messages			*/
/*


*/

// Recieve setting information and go through startup procedure
ipc.on("settings-information", (event, settings_information) => {
	settings = settings_information;
	startup();
});

// Recieve message from (eventually) invisible window with camera frame data
ipc.on("new-camera-frame", (event, centroid_results) => {
	// centroid_results is an object containing:
	//		image_buffer			-	Uint8Buffer - Current image frame
	// 		ccl_centers				-	Array		- Connect component labeling centroids
	//		hybrid_centers			-	Array		- Hybrid method centroids
	//		computation_time		-	Float		- Time to calculate centroids (ms)
	//		is_led_on				- 	Boolean		- Whether IR LED was on in image

	// Update electron counters
	electrons.update(centroid_results);
	update_counter_displays();
	// Add electrons to accumulated image and update display
	scan.update_images(centroid_results);
	update_accumulated_image_display();
});

/*


*/
/*			Various Functions			*/
/*


*/

/* Should move functions to the most related section */

// Format current date as MMDDYY
function getFormattedDate() {
	let today = new Date();
	let formattedDay = ("0" + today.getDate()).slice(-2);
	let formattedMonth = ("0" + (today.getMonth() + 1)).slice(-2);
	let formattedYear = today.getFullYear().toString().slice(-2);
	return formattedMonth + formattedDay + formattedYear;
}

// Format file name as MMDDYY_iXX_1024.i0N
function getCurrentFileName(ionCounter) {
	let todaysDate = getFormattedDate();
	// Slice here makes sure 0 is not included if ionCounter > 9
	let increment = ("0" + ionCounter).slice(-2);
	let fileString = `${todaysDate}i${increment}_1024.i0N`;
	let fileStringIR = `${todaysDate}i${increment}_IR_1024.i0N`;

	// Update file name in scan information
	scanInfo.fileName = fileString;
	scanInfo.fileNameIR = fileStringIR;

	// Check if that image already exists
	checkCurrentFile();

	return fileString;
}

// Check if file in Current File exists
function checkCurrentFile() {
	const currentFile = document.getElementById("CurrentFile");
	let fileName = settings.saveDirectory.currentScan + "/" + scanInfo.fileName;
	let fileNameIR = settings.saveDirectory.currentScan + "/" + scanInfo.fileNameIR;
	if (fs.existsSync(fileName) || fs.existsSync(fileNameIR)) {
		currentFile.title = "File already exists!";
		currentFile.style.color = "red";
		currentFile.style.border = "1pt solid red";
	} else {
		currentFile.title = null;
		currentFile.style.color = "white";
		currentFile.style.border = "1px solid rgb(62, 71, 95)";
	}
}

// ----------------------------------------------- //
